import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { CET_TOKEN_ABI } from "./abi/cetToken";
import "./App.css";

const CONTRACT_ADDRESS = import.meta.env.VITE_CET_CONTRACT_ADDRESS || "0x77f676eEd95f7752C8e76287cd386ed63218f71d";

const DEFAULT_DECIMALS = 18;
const EVENT_LOOKBACK_BLOCKS = 200000;
const HISTORY_LIMIT = 10;

const initialTokenState = {
  name: "",
  symbol: "",
  decimals: DEFAULT_DECIMALS,
  owner: "",
  totalSupply: "0",
  userBalance: "0",
};

const getInjectedProvider = () => {
  if (!window.ethereum) return undefined;
  if (window.ethereum.providers?.length) {
    const rabby = window.ethereum.providers.find((prov) => prov.isRabby);
    const metamask = window.ethereum.providers.find((prov) => prov.isMetaMask);
    return rabby || metamask || window.ethereum.providers[0];
  }
  return window.ethereum;
};

function App() {
  const [tokenState, setTokenState] = useState(initialTokenState);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [cashbackForm, setCashbackForm] = useState({ address: "", amount: "" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cashbackHistory, setCashbackHistory] = useState([]);
  const [burnHistory, setBurnHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const isOwner = useMemo(() => {
    if (!tokenState.owner || !account) return false;
    return tokenState.owner.toLowerCase() === account.toLowerCase();
  }, [tokenState.owner, account]);

  const decimals = tokenState.decimals || DEFAULT_DECIMALS;

  useEffect(() => {
    const injected = getInjectedProvider();
    if (!injected || !CONTRACT_ADDRESS) return;

    const provider = new BrowserProvider(injected);

    provider
      .send("eth_accounts", [])
      .then(async (accounts) => {
        if (!accounts.length) return;
        await hydrateState(accounts[0], provider);
      })
      .catch(() => {});

    const handleAccountsChanged = async (accounts) => {
      if (!accounts.length) {
        resetState();
        return;
      }
      await hydrateState(accounts[0], provider);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    injected.on?.("accountsChanged", handleAccountsChanged);
    injected.on?.("chainChanged", handleChainChanged);

    return () => {
      injected?.removeListener?.("accountsChanged", handleAccountsChanged);
      injected?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const resetState = () => {
    setAccount("");
    setChainId("");
    setTokenState(initialTokenState);
    setError("");
    setStatus("");
  };

  const getProvider = async () => {
    const injected = getInjectedProvider();
    if (!injected) {
      throw new Error("No EIP-1193 wallet detected. Install Rabby or MetaMask.");
    }
    return new BrowserProvider(injected);
  };

  const getContract = async (withSigner = false) => {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Missing VITE_CET_CONTRACT_ADDRESS in the frontend .env");
    }
    const provider = await getProvider();
    const scope = withSigner ? await provider.getSigner() : provider;
    return new Contract(CONTRACT_ADDRESS, CET_TOKEN_ABI, scope);
  };

  const hydrateState = async (selectedAccount, provider) => {
    try {
      setIsRefreshing(true);
      setError("");
      const refProvider = provider || (await getProvider());
      const contract = new Contract(
        CONTRACT_ADDRESS,
        CET_TOKEN_ABI,
        refProvider
      );
      const network = await refProvider.getNetwork();
      const [
        name,
        symbol,
        decimalsValue,
        ownerAddress,
        totalSupply,
        userBalance,
      ] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.owner(),
        contract.totalSupply(),
        contract.balanceOf(selectedAccount),
      ]);

      const [cashbacks, burns] = await fetchHistory(
        contract,
        refProvider,
        Number(decimalsValue)
      );

      setAccount(selectedAccount);
      setChainId(network.chainId.toString());
      setTokenState({
        name,
        symbol,
        decimals: Number(decimalsValue),
        owner: ownerAddress,
        totalSupply: formatUnits(totalSupply, decimalsValue),
        userBalance: formatUnits(userBalance, decimalsValue),
      });
      setCashbackHistory(cashbacks);
      setBurnHistory(burns);
      setStatus("Token state refreshed from chain.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to read contract state.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchHistory = async (contract, provider, decimalsValue) => {
    try {
      setIsHistoryLoading(true);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - EVENT_LOOKBACK_BLOCKS, 0);
      const [cashbacks, burns] = await Promise.all([
        contract.queryFilter(
          contract.filters.Cashback(),
          fromBlock,
          currentBlock
        ),
        contract.queryFilter(contract.filters.Burned(), fromBlock, currentBlock),
      ]);

      const mapLogs = async (logs, type) => {
        const sorted = [...logs].sort(
          (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
        );
        const limited = sorted.slice(0, HISTORY_LIMIT);
        return Promise.all(
          limited.map(async (log) => {
            const block = await provider.getBlock(log.blockNumber);
            return {
              type,
              tx: log.transactionHash,
              block: Number(log.blockNumber),
              timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
              amount: formatUnits(log.args.amount, decimalsValue),
              address: log.args.user || log.args.from,
            };
          })
        );
      };

      const [cashbackEvents, burnEvents] = await Promise.all([
        mapLogs(cashbacks, "cashback"),
        mapLogs(burns, "burn"),
      ]);

      return [cashbackEvents, burnEvents];
    } catch (err) {
      console.error("History fetch error:", err);
      setError(
        "Unable to load full history. Try refreshing or reduce lookback window."
      );
      return [[], []];
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const shorten = (value, chars = 4) => {
    if (!value) return "";
    return `${value.slice(0, chars + 2)}...${value.slice(-chars)}`;
  };

  const formatDisplayAmount = (value) => {
    if (value === undefined || value === null) return "0";
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return `${value} ${tokenState.symbol || "CET"}`;
    }
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${
      tokenState.symbol || "CET"
    }`;
  };

  const renderHistoryTable = (records, emptyCopy) => {
    if (isHistoryLoading) {
      return <p className="muted">Loading recent events...</p>;
    }

    if (!records.length) {
      return <p className="muted">{emptyCopy}</p>;
    }

    return (
      <table className="history-table">
        <thead>
          <tr>
            <th>Tx</th>
            <th>Address</th>
            <th>Amount</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {records.map((event) => (
            <tr key={event.tx}>
              <td>
                <a
                  href={`https://amoy.polygonscan.com/tx/${event.tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shorten(event.tx, 6)}
                </a>
              </td>
              <td className="mono">{shorten(event.address)}</td>
              <td>{formatDisplayAmount(event.amount)}</td>
              <td>{event.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const connectWallet = async () => {
    try {
      setError("");
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts.length) throw new Error("No accounts returned from wallet.");
      await hydrateState(accounts[0], provider);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect wallet.");
    }
  };

  const handleBurn = async (event) => {
    event.preventDefault();
    if (!burnAmount) return;
    try {
      setStatus("Submitting burn transaction...");
      setError("");
      const contract = await getContract(true);
      const tx = await contract.burn(parseUnits(burnAmount, decimals));
      await tx.wait();
      setStatus(`Burned ${burnAmount} ${tokenState.symbol}.`);
      setBurnAmount("");
      await hydrateState(account);
    } catch (err) {
      console.error(err);
      setError(err.message || "Burn failed.");
    }
  };

  const handleCashback = async (event) => {
    event.preventDefault();
    if (!cashbackForm.address || !cashbackForm.amount) return;
    try {
      setStatus("Submitting cashback transaction...");
      setError("");
      const contract = await getContract(true);
      const tx = await contract.giveCashback(
        cashbackForm.address,
        parseUnits(cashbackForm.amount, decimals)
      );
      await tx.wait();
      setStatus(
        `Cashback of ${cashbackForm.amount} ${tokenState.symbol} sent to ${cashbackForm.address}.`
      );
      setCashbackForm({ address: "", amount: "" });
      await hydrateState(account);
    } catch (err) {
      console.error(err);
      setError(err.message || "Cashback failed.");
    }
  };

  return (
    <div className="app">
      <header>
        <div>
          <p className="eyebrow">Chainfly Energy Token</p>
          <h1>{tokenState.name || "CET dApp Dashboard"}</h1>
          {!CONTRACT_ADDRESS && (
            <p className="warning">
              Missing `VITE_CET_CONTRACT_ADDRESS`. Update frontend/.env before
              interacting with Polygon Amoy.
            </p>
          )}
        </div>
        <button className="primary" onClick={connectWallet}>
          {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
        </button>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Token Snapshot</h2>
          <dl>
            <div>
              <dt>Symbol</dt>
              <dd>{tokenState.symbol || "—"}</dd>
            </div>
            <div>
              <dt>Total Supply</dt>
              <dd>{tokenState.totalSupply} {tokenState.symbol}</dd>
            </div>
            <div>
              <dt>Your Balance</dt>
              <dd>{tokenState.userBalance} {tokenState.symbol}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd className="mono">{tokenState.owner || "—"}</dd>
            </div>
            <div>
              <dt>Connected Account</dt>
              <dd className="mono">{account || "Not connected"}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{chainId ? `ChainId ${chainId}` : "—"}</dd>
            </div>
          </dl>
          <button
            className="ghost"
            onClick={() => (account ? hydrateState(account) : connectWallet())}
            disabled={isRefreshing || !account}
          >
            {isRefreshing ? "Refreshing..." : "Refresh state"}
          </button>
        </div>

        <div className="card">
          <h2>Burn Tokens</h2>
          <p>Reduce your balance and total supply by destroying CET.</p>
          <form onSubmit={handleBurn} className="form">
            <label>
              Amount ({tokenState.symbol || "CET"})
              <input
                type="number"
                min="0"
                step="0.01"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
              />
            </label>
            <button className="primary" type="submit" disabled={!burnAmount}>
              Burn CET
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Owner Cashback</h2>
          <p>Mint CET rewards for sustainable actions (owner only).</p>
          {!isOwner && (
            <p className="warning">
              Connect with the owner wallet to unlock cashback minting.
            </p>
          )}
          <form onSubmit={handleCashback} className="form">
            <label>
              Recipient address
              <input
                type="text"
                value={cashbackForm.address}
                onChange={(e) =>
                  setCashbackForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="0x..."
              />
            </label>
            <label>
              Amount ({tokenState.symbol || "CET"})
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashbackForm.amount}
                onChange={(e) =>
                  setCashbackForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </label>
            <button
              className="primary"
              type="submit"
              disabled={!isOwner || !cashbackForm.address || !cashbackForm.amount}
            >
              Send Cashback
            </button>
          </form>
        </div>
      </section>

      <section className="grid history-grid">
        <div className="card">
          <div className="card-header">
            <h2>Cashback History</h2>
            <span className="muted">Last {HISTORY_LIMIT} events</span>
          </div>
          {renderHistoryTable(
            cashbackHistory,
            "No cashback events in the recent lookback window."
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <h2>Burn History</h2>
            <span className="muted">Last {HISTORY_LIMIT} events</span>
          </div>
          {renderHistoryTable(
            burnHistory,
            "No burn events in the recent lookback window."
          )}
        </div>
      </section>

      <section className="status">
        {status && <p className="success">{status}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>How this dApp works</h2>
        <ol>
          <li>Connect MetaMask on Polygon Amoy (chain id 80002).</li>
          <li>Frontend reads CET metadata + balances via ethers v6.</li>
          <li>
            Owner wallet can mint cashback rewards while any account can burn
            CET.
          </li>
          <li>
            Update `frontend/.env` with `VITE_CET_CONTRACT_ADDRESS` to point at
            new deployments.
          </li>
        </ol>
      </section>
    </div>
  );
}

export default App;
