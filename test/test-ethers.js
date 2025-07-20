const { ethers } = require("hardhat");

async function main() {
  console.log("parseUnits:", ethers.utils.parseUnits("1.5", 18).toString());
}

main();
