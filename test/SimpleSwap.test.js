const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseUnits } = require("ethers");
const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos en el futuro

describe("SimpleSwap Contract", function () {
  let owner, user;
  let TokenA, TokenB, tokenA, tokenB;
  let SimpleSwap, simpleSwap;

  beforeEach(async () => {
    // Get signers from Hardhat (accounts to use in tests)
    [owner, user] = await ethers.getSigners();

    // Get ERC20Token factory and deploy two tokens
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    tokenA = await ERC20Token.deploy("Token A", "TKA", parseUnits("1000000", 18));
    await tokenA.waitForDeployment();

    tokenB = await ERC20Token.deploy("Token B", "TKB", parseUnits("1000000", 18));
    await tokenB.waitForDeployment();

    // Deploy SimpleSwap contract
    SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    simpleSwap = await SimpleSwap.deploy();
    await simpleSwap.waitForDeployment();

    console.log("TokenA address:", tokenA.target);
    console.log("TokenB address:", tokenB.target);
    console.log("SimpleSwap address:", simpleSwap.target);

    // Transfer tokens to user for swap tests (user needs tokens to approve)
    await tokenA.transfer(user.address, parseUnits("1000", 18));
    await tokenB.transfer(user.address, parseUnits("1000", 18));
  });

  it("should add liquidity correctly", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1000;

    // Approve tokens to SimpleSwap contract from owner
    await tokenA.connect(owner).approve(simpleSwap.target, parseUnits("1000", 18));
    await tokenB.connect(owner).approve(simpleSwap.target, parseUnits("1000", 18));

    // Add liquidity

    await simpleSwap.connect(owner).addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("1000", 18),
      parseUnits("90", 18),
      parseUnits("80", 18),
      owner.address,
      deadline
    );

    // Get reserves and assert correctness
    const reserves = await simpleSwap.reserves(tokenA.target, tokenB.target);

    expect(reserves.reserveA).to.equal(parseUnits("1000", 18));
    expect(reserves.reserveB).to.equal(parseUnits("1000", 18));
  });


  it("should return correct price from getPrice()", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1000;

    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("2000"));
    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("2000", 18),
      parseUnits("900", 18),
      parseUnits("100", 18),
      owner.address,
      deadline
    );

    const price = await simpleSwap.getPrice(tokenA.target, tokenB.target);
    expect(price.toString()).to.equal("2000000000000000000"); 
  });

  it("should perform a token swap correctly", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1000;

    // Add initial liquidity
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));

    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("1000", 18),
      parseUnits("900", 18),
      parseUnits("900", 18),
      owner.address,
      deadline
    );
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));
    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      1000,
      1000,
      900,
      900,
      owner.address,
      deadline
    );

    // User approves contract to spend tokenA
    await tokenA.connect(user).approve(simpleSwap.target, 100);

    const path = [tokenA.target, tokenB.target];

    // Perform token swap
    const tx = await simpleSwap.connect(user).swapExactTokensForTokens(
      100,
      80,
      path,
      user.address,
      deadline
    );

    // Check output token received
    const tokenBBalance = await tokenB.balanceOf(user.address);
    expect(tokenBBalance).to.be.gt(0);
  });
  it("should fail swap if not approved", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1000;
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));

    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("1000", 18),
      parseUnits("900", 18),
      parseUnits("900", 18),
      owner.address,
      deadline
    );
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));
    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      1000,
      1000,
      900,
      900,
      owner.address,
      deadline
  );

  const path = [tokenA.target, tokenB.target];

  await expect(
    simpleSwap.connect(user).swapExactTokensForTokens(
      100,
      80,
      path,
      user.address,
      deadline
    )
  ).to.be.revertedWithCustomError(tokenA, "ERC20InsufficientAllowance");

  });
  it("should fail swap with expired deadline", async () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 100;
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));

    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("1000", 18),
      parseUnits("900", 18),
      parseUnits("900", 18),
      owner.address,
      deadline
    );
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));
    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      1000,
      1000,
      900,
      900,
      owner.address,
      pastDeadline + 200 
    );
  
    await tokenA.connect(user).approve(simpleSwap.target, 100);
  
    const path = [tokenA.target, tokenB.target];
  
    await expect(
      simpleSwap.connect(user).swapExactTokensForTokens(
        100,
        80,
        path,
        user.address,
        pastDeadline
      )
    ).to.be.revertedWith("SimpleSwap: EXPIRED");
  });
  it("should fail getPrice() if no liquidity", async () => {
    await expect(
      simpleSwap.getPrice(tokenA.target, tokenB.target)
    ).to.be.revertedWith("SimpleSwap: INSUFFICIENT_LIQUIDITY");
  });
  it("should calculate output amount correctly", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 1000;
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));

    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      parseUnits("1000", 18),
      parseUnits("1000", 18),
      parseUnits("900", 18),
      parseUnits("900", 18),
      owner.address,
      deadline
    );
    await tokenA.approve(simpleSwap.target, parseUnits("1000"));
    await tokenB.approve(simpleSwap.target, parseUnits("1000"));
    await simpleSwap.addLiquidity(
      tokenA.target,
      tokenB.target,
      1000,
      1000,
      900,
      900,
      owner.address,
      deadline
    );
  
    const amountOut = await simpleSwap.getAmountOut(100, tokenA.target, tokenB.target);
    expect(amountOut).to.be.gt(0);
  });

});
