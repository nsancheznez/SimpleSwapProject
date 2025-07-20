import { useState } from 'react';
import { getPrice } from './SimpleSwapInterface';


import {
  connectWallet,
  getPriceAinB,
  getPriceBinA,
  approveTokenA,
  approveTokenB,
  addLiquidity,
  removeLiquidity,
  swapTokens,
  tokenAAddress,
  tokenBAddress
} from './SimpleSwapInterface';




function App() {
  const [connected, setConnected] = useState(false);
  const [priceAB, setPriceAB] = useState(null);
  const [priceBA, setPriceBA] = useState(null);
  const [amountApproveA, setAmountApproveA] = useState("0");
  const [amountApproveB, setAmountApproveB] = useState("0");
  const [amountAddA, setAmountAddA] = useState("0");
  const [amountAddB, setAmountAddB] = useState("0");
  const [liquidityRemove, setLiquidityRemove] = useState("0");
  const [swapAmountIn, setSwapAmountIn] = useState("0");
  const [swapAmountOutMin, setSwapAmountOutMin] = useState("0");
  const [status, setStatus] = useState("");
  const [simpleSwap, setSimpleSwap] = useState(null);



  // Conectar wallet
  const handleConnect = async () => {
    try {
      await connectWallet();
      setConnected(true);
      setStatus("Wallet conectada");
      alert("Conectado con éxito a MetaMask");
    } catch (e) {
      alert("Error al conectar: " + e.message);
    }
  };

  // Obtener precios
  const handleGetPrices = async () => {
    try {
      console.log("Ejecutando handleGetPrices");
  
      const reserves = await simpleSwap.getReserves();
      if (!reserves || !reserves.reserveA || !reserves.reserveB) {
        throw new Error("Reserves son inválidas");
      }
  
      const priceAtoB = reserves.reserveB / reserves.reserveA;
      const priceBtoA = reserves.reserveA / reserves.reserveB;
  
      setPriceAB(priceAtoB.toFixed(4));
      setPriceBA(priceBtoA.toFixed(4));
  
    } catch (err) {
      console.error("Error al obtener precios:", err);
      alert("Error al obtener precios: " + err.message);
    }
  };
  

  // Aprobar Token A
  const handleApproveA = async () => {
    try {
      setStatus("Aprobando Token A...");
      await approveTokenA(amountApproveA);
      setStatus("Token A aprobado");
    } catch (e) {
      setStatus("Error aprobando Token A: " + e.message);
    }
  };

  // Aprobar Token B
  const handleApproveB = async () => {
    try {
      setStatus("Aprobando Token B...");
      await approveTokenB(amountApproveB);
      setStatus("Token B aprobado");
    } catch (e) {
      setStatus("Error aprobando Token B: " + e.message);
    }
  };

  // Agregar liquidez
  const handleAddLiquidity = async () => {
    try {
      setStatus("Agregando liquidez...");
      const receipt = await addLiquidity(tokenAAddress, tokenBAddress, amountAddA, amountAddB);
      setStatus("Liquidez agregada! Tx hash: " + receipt.transactionHash);
    } catch (e) {
      setStatus("Error agregando liquidez: " + e.message);
    }
  };

  // Quitar liquidez
  const handleRemoveLiquidity = async () => {
    try {
      setStatus("Removiendo liquidez...");
      const receipt = await removeLiquidity(tokenAAddress, tokenBAddress, liquidityRemove);
      setStatus("Liquidez removida! Tx hash: " + receipt.transactionHash);
    } catch (e) {
      setStatus("Error removiendo liquidez: " + e.message);
    }
  };

  // Swap A → B
  const handleSwapAtoB = async () => {
    try {
      setStatus("Swapeando Token A por Token B...");
      await swapTokens(swapAmountIn, swapAmountOutMin, tokenAAddress, tokenBAddress);
      setStatus("Swap A→B completado");
    } catch (e) {
      setStatus("Error en swap A→B: " + e.message);
    }
  };

  // Swap B → A
  const handleSwapBtoA = async () => {
    try {
      setStatus("Swapeando Token B por Token A...");
      await swapTokens(swapAmountIn, swapAmountOutMin, tokenBAddress, tokenAAddress);
      setStatus("Swap B→A completado");
    } catch (e) {
      setStatus("Error en swap B→A: " + e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Simple Swap Interface</h1>

      {!connected && <button onClick={handleConnect}>Conectar Wallet</button>}

      {connected && (
        <>
        {console.log("Renderizando botón Obtener Precios")}
        {console.log("handleGetPrices:", handleGetPrices)}

          <button onClick={handleGetPrices}>Obtener Precios</button>
          {priceAB && <p>1 TokenA = {priceAB} TokenB</p>}
          {priceBA && <p>1 TokenB = {priceBA} TokenA</p>}

          <hr />

          <h2>Aprobar Tokens</h2>
          <div>
            <input
              type="text"
              placeholder="Cantidad Token A"
              value={amountApproveA}
              onChange={e => setAmountApproveA(e.target.value)}
            />
            <button onClick={handleApproveA}>Aprobar Token A</button>
          </div>
          <div>
            <input
              type="text"
              placeholder="Cantidad Token B"
              value={amountApproveB}
              onChange={e => setAmountApproveB(e.target.value)}
            />
            <button onClick={handleApproveB}>Aprobar Token B</button>
          </div>

          <hr />

          <h2>Agregar Liquidez</h2>
          <div>
            <input
              type="text"
              placeholder="Monto Token A"
              value={amountAddA}
              onChange={e => setAmountAddA(e.target.value)}
            />
            <input
              type="text"
              placeholder="Monto Token B"
              value={amountAddB}
              onChange={e => setAmountAddB(e.target.value)}
            />
            <button onClick={handleAddLiquidity}>Agregar Liquidez</button>
          </div>

          <hr />

          <h2>Quitar Liquidez</h2>
          <div>
            <input
              type="text"
              placeholder="Cantidad Liquidez"
              value={liquidityRemove}
              onChange={e => setLiquidityRemove(e.target.value)}
            />
            <button onClick={handleRemoveLiquidity}>Quitar Liquidez</button>
          </div>

          <hr />

          <h2>Swap Tokens</h2>
          <div>
            <input
              type="text"
              placeholder="Cantidad a swappear"
              value={swapAmountIn}
              onChange={e => setSwapAmountIn(e.target.value)}
            />
            <input
              type="text"
              placeholder="Cantidad mínima a recibir"
              value={swapAmountOutMin}
              onChange={e => setSwapAmountOutMin(e.target.value)}
            />
            <button onClick={handleSwapAtoB}>Swap A → B</button>
            <button onClick={handleSwapBtoA}>Swap B → A</button>
          </div>

          <hr />

          <p>Status: {status}</p>
        </>
      )}
    </div>
  );
}

export default App;
