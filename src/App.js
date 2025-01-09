import React, { useState, useEffect } from 'react';          // Import React and useState to manage state
import { Chessboard } from 'react-chessboard';    // Import Chessboard component from react-chessboard
import { Chess } from 'chess.js';                 // Import Chess logic from chess.js

// Main App component
const App = () => {
  // Initialize the game state using useState with a new Chess instance
  const [game, setGame] = useState(new Chess());
  const [stockfish, setStockfish] = useState(null);
  const [bestMove, setBestMove] = useState("");
  const [evaluation, setEvaluation] = useState("");

  const getEvaluation = (message, turn) => {
    let result = { bestMove: "", evaluation: "" }; // Initialize with default values
  
    // Check for "bestmove" in the message to get the best move
    if (message.startsWith("bestmove")) {
      result.bestMove = message.split(" ")[1];
    }
  
    // Check for "info score" message to get the evaluation
    if (message.includes("info") && message.includes("score")) {
      const scoreParts = message.split(" ");
      const scoreIndex = scoreParts.indexOf("score") + 2; // "cp" or "mate" is two words after "score"
  
      if (scoreParts[scoreIndex - 1] === "cp") {
        // Extract centipawn evaluation and adjust based on turn
        let score = parseInt(scoreParts[scoreIndex], 10);
        if (turn !== "b") {
          score = -score; // Invert score if it was Black's turn
        }
        result.evaluation = `${score / 100}`; // Convert centipawns to pawns
  
      } else if (scoreParts[scoreIndex - 1] === "mate") {
        // Extract mate score if available
        const mateIn = parseInt(scoreParts[scoreIndex], 10);
        result.evaluation = `Mate in ${Math.abs(mateIn)}`;
      }
    }
  
    return result;
  };

  useEffect(() => {
    // Load Stockfish as a Web Worker once when the component mounts
    const stockfishWorker = new Worker("/js/stockfish-16.1-lite-single.js");
    setStockfish(stockfishWorker);
  
  
    return () => {
      stockfishWorker.terminate(); // Clean up the worker when the component unmounts
    };
  }, []);
  // Function to handle piece movement on the chessboard
  const onDrop = (sourceSquare, targetSquare) => {
    // Create a copy of the current game state using FEN notation

    const gameCopy = new Chess(game.fen());

    try {
      // Attempt to make the move on the game copy
      const move = gameCopy.move({
        from: sourceSquare,   // Starting square of the move
        to: targetSquare,     // Target square of the move
        promotion: 'q'        // Always promote to a queen for simplicity
      });

      // If the move is invalid, move will be null, so we return false to ignore the move
      if (move === null) {
        return false;
      }

      // If the move is valid, update the game state with the new position
      setGame(gameCopy);
      if (stockfish) {
        stockfish.postMessage(`position fen ${gameCopy.fen()}`);
        stockfish.postMessage("go depth 15"); // Set depth for Stockfish analysis
      }

      stockfish.onmessage = (event) => {
        const { bestMove, evaluation } = getEvaluation(event.data, game.turn());
        if (bestMove) setBestMove(bestMove);
        if (evaluation) setEvaluation(evaluation);
      };
      return true; // Return true to indicate a valid move
    } catch (error) {
      // Catch and log any errors that occur during the move attempt
      console.error(error.message);
      return false; // Return false to ignore the invalid move
    }
  };

  return (
    <div>
      <h1>Chess Game</h1>
      <Chessboard
        position={game.fen()}      // Set the chessboard position to the current game state
        onPieceDrop={onDrop}       // Trigger the onDrop function when a piece is moved
        boardWidth={500}           // Set the width of the chessboard to 500px
      />
      <div>
        <h3>Best Move: {bestMove || "Calculating..."}</h3>
        <h3>Evaluation: {evaluation || "Evaluating..."}</h3> {/* Display the evaluation */}
      </div>
    </div>
  );
};

export default App;  // Export the App component as the default export