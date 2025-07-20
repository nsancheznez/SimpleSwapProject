const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');


async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", await deployer.getAddress());
  const initialSupply = ethers.parseUnits("1000000", 18);

  const TokenA = await ethers.getContractFactory("ERC20Token");
  const tokenA = await TokenA.deploy("Token A", "TKA", initialSupply);

  console.log("Token A deployed to:", await tokenA.getAddress());

  const TokenB = await ethers.getContractFactory("ERC20Token");
  const tokenB = await TokenB.deploy("Token B", "TKB", initialSupply);
  console.log("Token B deployed to:", await tokenB.getAddress());

  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy();
  console.log("SimpleSwap deployed to:", await simpleSwap.getAddress());

  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();
  const simpleSwapAddress = await simpleSwap.getAddress();
  
  const addresses = {
    tokenA: await tokenA.getAddress(),
    tokenB: await tokenB.getAddress(),
    simpleSwap: await simpleSwap.getAddress()
  };
  const filePath = path.resolve(__dirname, '../simpleswap-frontend/src/deployedAddresses.json');
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  