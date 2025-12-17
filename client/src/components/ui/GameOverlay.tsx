import { useEffect, useRef } from "react";
import { useMaze, Algorithm } from "@/lib/stores/useMaze";
import { runAlgorithm } from "@/lib/pathfinding";

const algorithmNames: Record<Algorithm, string> = {
  astar: "A* Search",
  bfs: "Breadth-First Search",
  dfs: "Depth-First Search",
  ucs: "Uniform Cost Search",
  ids: "Iterative Deepening Search",
};

export function GameOverlay() {
  const hasSolvedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visualizationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const phase = useMaze(state => state.phase);
  const selectedAlgorithm = useMaze(state => state.selectedAlgorithm);
  const path = useMaze(state => state.path);
  const visitedCells = useMaze(state => state.visitedCells);
  const pathIndex = useMaze(state => state.pathIndex);
  const restart = useMaze(state => state.restart);
  const maze = useMaze(state => state.maze);
  const startPos = useMaze(state => state.startPos);
  const endPos = useMaze(state => state.endPos);
  const setPath = useMaze(state => state.setPath);
  const setVisitedCells = useMaze(state => state.setVisitedCells);
  const storeVisitedCells = useMaze(state => state.storeVisitedCells);
  const setStats = useMaze(state => state.setStats);
  const startMoving = useMaze(state => state.startMoving);
  const stats = useMaze(state => state.stats);
  const visualizationMode = useMaze(state => state.visualizationMode);
  const visualizationIndex = useMaze(state => state.visualizationIndex);
  const startVisualization = useMaze(state => state.startVisualization);
  const advanceVisualization = useMaze(state => state.advanceVisualization);
  
  useEffect(() => {
    if (phase === "menu") {
      hasSolvedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (visualizationIntervalRef.current) {
        clearInterval(visualizationIntervalRef.current);
        visualizationIntervalRef.current = null;
      }
    }
  }, [phase]);
  
  useEffect(() => {
    if (phase === "solving" && selectedAlgorithm && !hasSolvedRef.current) {
      hasSolvedRef.current = true;
      
      console.log(`Running ${selectedAlgorithm} algorithm...`);
      
      const mazeCopy = maze.map(row => row.map(cell => ({ ...cell })));
      const result = runAlgorithm(selectedAlgorithm, mazeCopy, startPos, endPos);
      
      console.log(`Path found: ${result.path.length} cells`);
      console.log(`Visited: ${result.visited.length} cells`);
      console.log(`Time: ${result.stats.solveTimeMs.toFixed(2)}ms`);
      
      setStats(result.stats);
      
      if (visualizationMode === "step") {
        storeVisitedCells(result.visited);
        useMaze.setState({ path: result.path });
        timeoutRef.current = setTimeout(() => {
          startVisualization();
        }, 300);
      } else {
        setVisitedCells(result.visited);
        setPath(result.path);
        timeoutRef.current = setTimeout(() => {
          startMoving();
        }, 500);
      }
    }
  }, [phase, selectedAlgorithm]);
  
  useEffect(() => {
    if (phase === "visualizing") {
      visualizationIntervalRef.current = setInterval(() => {
        const hasMore = advanceVisualization();
        if (!hasMore) {
          if (visualizationIntervalRef.current) {
            clearInterval(visualizationIntervalRef.current);
            visualizationIntervalRef.current = null;
          }
          timeoutRef.current = setTimeout(() => {
            startMoving();
          }, 500);
        }
      }, 30);
      
      return () => {
        if (visualizationIntervalRef.current) {
          clearInterval(visualizationIntervalRef.current);
        }
      };
    }
  }, [phase]);
  
  if (phase === "menu") return null;
  
  return (
    <>
      <div className="absolute top-4 left-4 bg-gray-900/90 p-4 rounded-lg border border-gray-700 z-10">
        <div className="text-white font-semibold mb-2">
          Algorithm: {selectedAlgorithm && algorithmNames[selectedAlgorithm]}
        </div>
        <div className="text-gray-400 text-sm space-y-1">
          {stats && (
            <>
              <div>Solve Time: <span className="text-yellow-400">{stats.solveTimeMs.toFixed(2)}ms</span></div>
              <div>Nodes Explored: <span className="text-red-400">{stats.nodesExplored}</span></div>
              <div>Path Length: <span className="text-cyan-400">{stats.pathLength}</span></div>
            </>
          )}
          {phase === "visualizing" && (
            <div>Visualizing: <span className="text-orange-400">{visualizationIndex} / {visitedCells.length}</span></div>
          )}
          {phase === "moving" && (
            <div>Progress: <span className="text-green-400">{pathIndex} / {path.length}</span></div>
          )}
        </div>
      </div>
      
      {phase === "completed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center border border-gray-700 max-w-md">
            <h2 className="text-3xl font-bold text-green-400 mb-4">
              Maze Solved!
            </h2>
            <div className="text-gray-300 mb-6 space-y-2">
              <p>Algorithm: <span className="text-white font-semibold">{selectedAlgorithm && algorithmNames[selectedAlgorithm]}</span></p>
              {stats && (
                <>
                  <p>Solve Time: <span className="text-yellow-400 font-semibold">{stats.solveTimeMs.toFixed(2)}ms</span></p>
                  <p>Nodes Explored: <span className="text-red-400 font-semibold">{stats.nodesExplored}</span></p>
                  <p>Path Length: <span className="text-cyan-400 font-semibold">{stats.pathLength}</span></p>
                </>
              )}
            </div>
            <button
              onClick={restart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
              Try Another Algorithm
            </button>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={restart}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 transition-all"
        >
          Restart
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-gray-900/90 p-3 rounded-lg border border-gray-700 z-10">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <span className="w-3 h-3 rounded bg-red-500/60"></span> Explored
          </span>
          <span className="flex items-center gap-2 text-gray-300">
            <span className="w-3 h-3 rounded bg-cyan-500/80"></span> Path
          </span>
        </div>
      </div>
    </>
  );
}
