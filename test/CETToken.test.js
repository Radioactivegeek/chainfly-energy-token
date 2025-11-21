const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CETToken", () => {
  const DECIMALS = 18n;
  const toUnits = (value) => ethers.parseUnits(value.toString(), DECIMALS);

  let owner;
  let user;
  let other;
  let token;

  beforeEach(async () => {
    [owner, user, other] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("CETToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();
  });

  it("mints the initial supply to the owner", async () => {
    const initialSupply = await token.INITIAL_SUPPLY();
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);
    expect(await token.totalSupply()).to.equal(initialSupply);
  });

  it("allows only owner to mint cashback or new tokens", async () => {
    const mintAmount = toUnits(1000);
    await expect(token.connect(owner).mint(user.address, mintAmount))
      .to.emit(token, "Minted")
      .withArgs(user.address, mintAmount);

    await expect(
      token.connect(user).mint(user.address, mintAmount)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("lets anyone burn their tokens and emits events", async () => {
    const toBurn = toUnits(10);
    await token.connect(owner).transfer(user.address, toBurn);

    await expect(token.connect(user).burn(toBurn))
      .to.emit(token, "Burned")
      .withArgs(user.address, toBurn);

    expect(await token.balanceOf(user.address)).to.equal(0);
  });

  it("allows owner to burnFrom specific account", async () => {
    const amount = toUnits(5);
    await token.connect(owner).transfer(user.address, amount);
    await token.connect(user).approve(owner.address, amount);

    await expect(token.connect(owner).burnFrom(user.address, amount))
      .to.emit(token, "Burned")
      .withArgs(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(0);
  });

  it("allows owner to give cashback (mint) to any address", async () => {
    const reward = toUnits(25);
    await expect(token.connect(owner).giveCashback(user.address, reward))
      .to.emit(token, "Cashback")
      .withArgs(user.address, reward);

    expect(await token.balanceOf(user.address)).to.equal(reward);
  });

  it("prevents non-owners from calling owner-gated functions", async () => {
    const reward = toUnits(1);
    await expect(
      token.connect(user).giveCashback(other.address, reward)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

    await expect(
      token.connect(user).burnFrom(other.address, reward)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
});

