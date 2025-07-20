import { ethers } from "ethers";

// Dirección del contrato y ABI generado por Hardhat
import deployedAddresses from "./deployedAddresses.json";

const contractAddress = deployedAddresses.simpleSwap; 
const tokenAAddress = deployedAddresses.tokenA;
const tokenBAddress = deployedAddresses.tokenB;

let provider, signer, contract;
let tokenAContract, tokenBContract;

const abi = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory)",
  "function getPrice(address tokenA, address tokenB) external view returns (uint)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)"
];


const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];




export async function connectWallet() {
  if (!window.ethereum) {
    alert("Por favor instala MetaMask");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  contract = new ethers.Contract(contractAddress, abi, signer);
  tokenAContract = new ethers.Contract(tokenAAddress, erc20Abi, signer);
  tokenBContract = new ethers.Contract(tokenBAddress, erc20Abi, signer);

}
// Aprobar gasto para SimpleSwap por TokenA
export async function approveTokenA(amount) {
  const tx = await tokenAContract.approve(contractAddress, ethers.parseUnits(amount, 18));
  await tx.wait();
}

// Aprobar gasto para SimpleSwap por TokenB
export async function approveTokenB(amount) {
  const tx = await tokenBContract.approve(contractAddress, ethers.parseUnits(amount, 18));
  await tx.wait();
}

// Función para hacer swap (tokenIn → tokenOut)
// amountIn y amountOutMin en formato string, ejemplo "10"
export async function swapTokens(amountIn, amountOutMin, tokenIn, tokenOut) {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos en futuro
  const path = [tokenIn, tokenOut];
  const to = await signer.getAddress();

  const tx = await contract.swapExactTokensForTokens(
    ethers.parseUnits(amountIn, 18),
    ethers.parseUnits(amountOutMin, 18),
    path,
    to,
    deadline
  );
  await tx.wait();
}

// Obtener precio de tokenA en tokenB, devuelve BigNumber
export async function getPrice(tokenA, tokenB) {
  console.log("Ejecutando getPrice con:", tokenA, tokenB);
  console.log("Métodos del contrato:", Object.keys(contract));
  try{
    const priceBN = await contract.getPrice(tokenA, tokenB);
    console.log("Precio obtenido:", priceBN.toString());
    return priceBN;
  }catch(err){
    console.error("error getprice", err);
    return null;
  }
}

// Funciones auxiliares para obtener precios en formato decimal
export async function getPriceAinB() {
  const priceBN = await getPrice(tokenAAddress, tokenBAddress);
  return ethers.formatUnits(priceBN, 18);
}

export async function getPriceBinA() {
  const priceBN = await getPrice(tokenBAddress, tokenAAddress);
  return ethers.formatUnits(priceBN, 18);
}
async function showPrice() {
  const price = await getBPrice("1");
  alert("Price de B: " + ethers.formatUnits(price, 18));
}

export async function addLiquidity(
  tokenA,
  tokenB,
  amountADesired,
  amountBDesired,
  amountAMin = "0",
  amountBMin = "0"
) {
  if (!signer || !contract) throw new Error("Conectar wallet primero");

  // Calcular deadline: 10 minutos desde ahora
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  // Convertir cantidades a BigNumber con 18 decimales
  const amountAParsed = ethers.parseUnits(amountADesired, 18);
  const amountBParsed = ethers.parseUnits(amountBDesired, 18);
  const amountAMinParsed = ethers.parseUnits(amountAMin, 18);
  const amountBMinParsed = ethers.parseUnits(amountBMin, 18);

  const to = await signer.getAddress();

  // Primero aprobar el gasto de tokens A y B para el contrato SimpleSwap
  const tokenAContract = new ethers.Contract(tokenA, erc20Abi, signer);
  const tokenBContract = new ethers.Contract(tokenB, erc20Abi, signer);

  let tx = await tokenAContract.approve(contractAddress, amountAParsed);
  await tx.wait();

  tx = await tokenBContract.approve(contractAddress, amountBParsed);
  await tx.wait();

  // Llamar addLiquidity en el contrato SimpleSwap
  tx = await contract.addLiquidity(
    tokenA,
    tokenB,
    amountAParsed,
    amountBParsed,
    amountAMinParsed,
    amountBMinParsed,
    to,
    deadline
  );

  const receipt = await tx.wait();

  return receipt; 
}

export async function removeLiquidity(tokenA, tokenB, liquidityAmount) {
  if (!signer || !contract) throw new Error("Conectar wallet primero");

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
  const to = await signer.getAddress();
  const liquidityParsed = ethers.parseUnits(liquidityAmount, 18);

  // Asumimos que el contrato LP sigue el estándar ERC20
  const pairAddress = await contract.getPair(tokenA, tokenB); // Necesitás esta función en tu contrato
  const lpToken = new ethers.Contract(pairAddress, erc20Abi, signer);

  // Aprobar al contrato para mover los LP tokens
  const approveTx = await lpToken.approve(contractAddress, liquidityParsed);
  await approveTx.wait();

  // Ejecutar removeLiquidity
  const tx = await contract.removeLiquidity(
    tokenA,
    tokenB,
    liquidityParsed,
    0,
    0,
    to,
    deadline
  );

  return await tx.wait();
}

export { tokenAAddress, tokenBAddress };