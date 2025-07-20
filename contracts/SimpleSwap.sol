// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title SimpleSwap
 * @dev A minimal implementation of a decentralized exchange similar to Uniswap V2
 */
contract SimpleSwap {

    /// @notice Estructura para guardar las reservas de cada par
    struct Reserve {
        uint reserveA;
        uint reserveB;
    }

    /// @dev Mapping token pairs to their reserves
    mapping(address => mapping(address => Reserve)) public reserves;
    /// @dev Mapping to track user liquidity balances per token pair
    mapping(address => mapping(address => mapping(address => uint))) public liquidityBalances;


    /// @notice Event to add liquidity
    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint amountA, uint amountB, uint liquidity);

    /// @notice Event to remove liquidity
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint amountA, uint amountB);

    /// @notice Evento para intercambio de tokens
    event Swap(address indexed user, address inputToken, address outputToken, uint amountIn, uint amountOut);

    // --- 1️⃣ ADD LIQUIDITY ---
    /**
     * @notice Add liquidity to a token pair pool
     */
    /// @notice Adds liquidity to a token pair pool.
    /// @param tokenA Address of the first token.
    /// @param tokenB Address of the second token.
    /// @param amountADesired Desired amount of tokenA to add.
    /// @param amountBDesired Desired amount of tokenB to add.
    /// @param amountAMin Minimum acceptable amount of tokenA.
    /// @param amountBMin Minimum acceptable amount of tokenB.
    /// @param to Address that will receive the liquidity share.
    /// @param deadline Transaction must be completed before this timestamp.
    /// @return amountA Actual amount of tokenA added.
    /// @return amountB Actual amount of tokenB added.
    /// @return liquidity Amount of liquidity units issued.

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        require(block.timestamp <= deadline, "SimpleSwap: EXPIRED");
    
        // Ensure token ordering for consistent storage
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    
        Reserve storage res = reserves[token0][token1];
    
        if (res.reserveA == 0 && res.reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            // Compute optimal amountB based on current reserve ratio
            uint amountBOptimal = (amountADesired * res.reserveB) / res.reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "SimpleSwap: INSUFFICIENT_B_AMOUNT");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint amountAOptimal = (amountBDesired * res.reserveA) / res.reserveB;
                require(amountAOptimal >= amountAMin, "SimpleSwap: INSUFFICIENT_A_AMOUNT");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }
    
        // Transfer tokens from user to contract
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
    
        // Compute liquidity (simplified logic)
        liquidity = amountA + amountB;
    
        // Update reserves
        res.reserveA += amountA;
        res.reserveB += amountB;
    
        // Track user liquidity
        liquidityBalances[to][token0][token1] += liquidity;
    
        emit LiquidityAdded(to, tokenA, tokenB, amountA, amountB, liquidity);
    }

    // --- 2️⃣ REMOVE LIQUIDITY ---
    /**
     * @notice Remove liquidity from a token pair pool
     */
    /// @notice Removes liquidity from a token pair pool.
    /// @param tokenA Address of the first token.
    /// @param tokenB Address of the second token.
    /// @param liquidity Amount of liquidity to remove.
    /// @param amountAMin Minimum acceptable amount of tokenA to receive.
    /// @param amountBMin Minimum acceptable amount of tokenB to receive.
    /// @param to Address to which the tokens will be sent.
    /// @param deadline Transaction must be completed before this timestamp.
    /// @return amountA Amount of tokenA returned to user.
    /// @return amountB Amount of tokenB returned to user.

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB) {
        require(block.timestamp <= deadline, "SimpleSwap: EXPIRED");
    
        // Ensure token order
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    
        Reserve storage res = reserves[token0][token1];
    
        uint userLiquidity = liquidityBalances[msg.sender][token0][token1];
        require(userLiquidity >= liquidity, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
    
        uint totalLiquidity = res.reserveA + res.reserveB;
    
        // Compute token amounts to withdraw based on user's liquidity share
        amountA = (liquidity * res.reserveA) / totalLiquidity;
        amountB = (liquidity * res.reserveB) / totalLiquidity;
    
        require(amountA >= amountAMin, "SimpleSwap: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "SimpleSwap: INSUFFICIENT_B_AMOUNT");
    
        // Update reserves
        res.reserveA -= amountA;
        res.reserveB -= amountB;
    
        // Burn user's liquidity
        liquidityBalances[msg.sender][token0][token1] -= liquidity;
    
        // Transfer tokens to user
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
    
        emit LiquidityRemoved(to, tokenA, tokenB, amountA, amountB);
    }

    // --- 3️⃣ SWAP ---
    /**
     * @notice Swap exact amount of input tokens for output tokens
     */
    /// @notice Swaps a fixed amount of input tokens for output tokens.
    /// @param amountIn Exact amount of input tokens to swap.
    /// @param amountOutMin Minimum amount of output tokens to receive.
    /// @param path Array of two token addresses: input and output.
    /// @param to Recipient of the output tokens.
    /// @param deadline Transaction must be completed before this timestamp.
    /// @return amounts Array containing input and output amounts.


    struct SwapParams {
        uint amountIn;
        uint amountOutMin;
        address[] path;
        address to;
        uint deadline;
    }
    function getAmountOutInternal(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) internal pure returns (uint amountOut) {
        require(amountIn > 0, "SimpleSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    }

    function swapExactTokensForTokensSimple(SwapParams memory params) public returns (    uint[] memory amounts) {
        require(block.timestamp <= params.deadline, "SimpleSwap: EXPIRED");
        require(params.path.length == 2, "SimpleSwap: INVALID_PATH");
    
        address tokenIn = params.path[0];
        address tokenOut = params.path[1];
        require(tokenIn != tokenOut, "SimpleSwap: SAME_TOKEN");
    
        // Ordenar tokens
        (address token0, address token1) = tokenIn < tokenOut
            ? (tokenIn, tokenOut)
            : (tokenOut, tokenIn);
    
        Reserve storage res = reserves[token0][token1];
    
        // Obtener reservas
        uint reserveIn;
        uint reserveOut;
    
        if (tokenIn == token0) {
            reserveIn = res.reserveA;
            reserveOut = res.reserveB;
        } else {
            reserveIn = res.reserveB;
            reserveOut = res.reserveA;
        }
    
        require(reserveIn > 0 && reserveOut > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
    
        // Calcular salida  
        uint amountOut = getAmountOutInternal(params.amountIn,  reserveIn, reserveOut);
        require(amountOut >= params.amountOutMin, "SimpleSwap:  INSUFFICIENT_OUTPUT_AMOUNT");
    
        // Transferir tokenIn desde el usuario al contrato
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn),
            "SimpleSwap: TRANSFER_FROM_FAILED"
        );
    
        // Transferir tokenOut desde el contrato al destinatario
        require(
            IERC20(tokenOut).transfer(params.to, amountOut),
            "SimpleSwap: TRANSFER_FAILED"
        );
    
        // Actualizar reservas según el orden
        if (tokenIn == token0) {
            res.reserveA += params.amountIn;
            res.reserveB -= amountOut;
        } else {
            res.reserveB += params.amountIn;
            res.reserveA -= amountOut;
        }
    
        // Devolver resultado
        amounts = new uint[](2) ;
        amounts[0] = params.amountIn;
        amounts[1] = amountOut;
    
        emit Swap(msg.sender, tokenIn, tokenOut, params.amountIn, amountOut);
    }
    function swapExactTokensForTokens(
            uint amountIn,
            uint amountOutMin,
            address[] calldata path,
            address to,
            uint deadline
        ) external returns (uint[] memory amounts) {
            SwapParams memory params = SwapParams({
                amountIn: amountIn,
                amountOutMin: amountOutMin,
                path: path,
                to: to,
                deadline: deadline
            });
    
            return swapExactTokensForTokensSimple(params);
        }

    // --- 4️⃣ GET PRICE ---
    /**
     * @notice Get the price of tokenA in terms of tokenB
     */
    /// @notice Returns the current price of tokenA in terms of tokenB.
    /// @param tokenA Address of the token whose price is being queried.
    /// @param tokenB Address of the reference token.
    /// @return price The price of tokenA in tokenB, scaled by 1e18.

    function getPrice(
        address tokenA,
        address tokenB
    ) external view returns (uint price) {
        require(tokenA != tokenB, "SimpleSwap: IDENTICAL_ADDRESSES");
    
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    
        Reserve storage res = reserves[token0][token1];
    
        uint reserveA;
        uint reserveB;
    
        if (tokenA == token0) {
            reserveA = res.reserveA;
            reserveB = res.reserveB;
        } else {
            reserveA = res.reserveB;
            reserveB = res.reserveA;
        }
    
        require(reserveA > 0 && reserveB > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
    
        price = (reserveB * 1e18) / reserveA;
    }

    // --- 5️⃣ GET AMOUNT OUT ---
    /**
     * @notice Calculate the amount of output tokens for a given input
     */
    /// @notice Calculates how many output tokens will be received for a given input.
    /// @param amountIn Amount of input tokens.
    /// @param reserveIn Reserve of input tokens in the pool.
    /// @param reserveOut Reserve of output tokens in the pool.
    /// @return amountOut Amount of output tokens that would be received.

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountOut) {
        require(amountIn > 0, "SimpleSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
    
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
    }
}