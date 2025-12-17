import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type Algorithm = "astar" | "bfs" | "dfs" | "ucs" | "ids";
export type GamePhase = "menu" | "solving" | "visualizing" | "moving" | "completed";
export type Difficulty = "easy" | "medium" | "hard";
export type VisualizationMode = "instant" | "step";

export interface Position {
  x: number;
  z: number;
}

export interface MazeCell {
  x: number;
  z: number;
  isWall: boolean;
  isStart: boolean;
  isEnd: boolean;
  isPath: boolean;
  isVisited: boolean;
}

export interface AlgorithmStats {
  solveTimeMs: number;
  nodesExplored: number;
  pathLength: number;
}

interface MazeState {
  phase: GamePhase;
  selectedAlgorithm: Algorithm | null;
  maze: MazeCell[][];
  mazeWidth: number;
  mazeHeight: number;
  startPos: Position;
  endPos: Position;
  path: Position[];
  visitedCells: Position[];
  ballPosition: Position;
  pathIndex: number;
  stats: AlgorithmStats | null;
  visualizationMode: VisualizationMode;
  difficulty: Difficulty;
  visualizationIndex: number;
  
  setAlgorithm: (algo: Algorithm) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  setDifficulty: (diff: Difficulty) => void;
  startGame: () => void;
  setPath: (path: Position[]) => void;
  setVisitedCells: (cells: Position[]) => void;
  storeVisitedCells: (cells: Position[]) => void;
  setStats: (stats: AlgorithmStats) => void;
  startVisualization: () => void;
  advanceVisualization: () => boolean;
  startMoving: () => void;
  moveBall: () => boolean;
  complete: () => void;
  restart: () => void;
  generateMaze: () => void;
  loadPresetMaze: (preset: number) => void;
}

const DIFFICULTY_SIZES: Record<Difficulty, { width: number; height: number }> = {
  easy: { width: 11, height: 11 },
  medium: { width: 15, height: 15 },
  hard: { width: 21, height: 21 },
};

function generateRandomMaze(width: number, height: number): { maze: MazeCell[][], start: Position, end: Position } {
  const maze: MazeCell[][] = [];
  
  for (let z = 0; z < height; z++) {
    maze[z] = [];
    for (let x = 0; x < width; x++) {
      maze[z][x] = {
        x,
        z,
        isWall: true,
        isStart: false,
        isEnd: false,
        isPath: false,
        isVisited: false,
      };
    }
  }
  
  const start: Position = { x: 1, z: 1 };
  const end: Position = { x: width - 2, z: height - 2 };
  
  function carve(x: number, z: number) {
    maze[z][x].isWall = false;
    
    const directions = [
      { dx: 0, dz: -2 },
      { dx: 0, dz: 2 },
      { dx: -2, dz: 0 },
      { dx: 2, dz: 0 },
    ];
    
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    for (const dir of directions) {
      const newX = x + dir.dx;
      const newZ = z + dir.dz;
      
      if (
        newX > 0 && newX < width - 1 &&
        newZ > 0 && newZ < height - 1 &&
        maze[newZ][newX].isWall
      ) {
        maze[z + dir.dz / 2][x + dir.dx / 2].isWall = false;
        carve(newX, newZ);
      }
    }
  }
  
  carve(1, 1);
  
  maze[start.z][start.x].isStart = true;
  maze[start.z][start.x].isWall = false;
  maze[end.z][end.x].isEnd = true;
  maze[end.z][end.x].isWall = false;
  
  if (maze[end.z - 1] && maze[end.z - 1][end.x]) {
    maze[end.z - 1][end.x].isWall = false;
  }
  if (maze[end.z] && maze[end.z][end.x - 1]) {
    maze[end.z][end.x - 1].isWall = false;
  }
  
  return { maze, start, end };
}

const PRESET_MAZES: Array<{ walls: number[][], width: number, height: number }> = [
  {
    width: 15,
    height: 15,
    walls: [
      [2, 1], [2, 2], [2, 3], [2, 5], [2, 6], [2, 7], [2, 9], [2, 10], [2, 11],
      [4, 3], [4, 4], [4, 5], [4, 7], [4, 8], [4, 9], [4, 11], [4, 12], [4, 13],
      [5, 3], [5, 9],
      [6, 1], [6, 3], [6, 5], [6, 6], [6, 7], [6, 9], [6, 11],
      [7, 5], [7, 11],
      [8, 1], [8, 2], [8, 3], [8, 5], [8, 7], [8, 8], [8, 9], [8, 11], [8, 12], [8, 13],
      [9, 7],
      [10, 1], [10, 2], [10, 3], [10, 5], [10, 6], [10, 7], [10, 9], [10, 10], [10, 11],
      [11, 3], [11, 9],
      [12, 3], [12, 5], [12, 6], [12, 7], [12, 9], [12, 11], [12, 12], [12, 13],
    ],
  },
  {
    width: 15,
    height: 15,
    walls: [
      [2, 2], [2, 4], [2, 6], [2, 8], [2, 10], [2, 12],
      [3, 2], [3, 6], [3, 10],
      [4, 2], [4, 4], [4, 6], [4, 8], [4, 10], [4, 12],
      [5, 4], [5, 8], [5, 12],
      [6, 2], [6, 4], [6, 6], [6, 8], [6, 10], [6, 12],
      [7, 2], [7, 6], [7, 10],
      [8, 2], [8, 4], [8, 6], [8, 8], [8, 10], [8, 12],
      [9, 4], [9, 8], [9, 12],
      [10, 2], [10, 4], [10, 6], [10, 8], [10, 10], [10, 12],
      [11, 2], [11, 6], [11, 10],
      [12, 2], [12, 4], [12, 6], [12, 8], [12, 10], [12, 12],
    ],
  },
  {
    width: 15,
    height: 15,
    walls: [
      [1, 7], [2, 7], [3, 7], [4, 7], [5, 7],
      [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 9], [7, 10], [7, 11], [7, 12], [7, 13],
      [9, 7], [10, 7], [11, 7], [12, 7], [13, 7],
      [3, 3], [3, 11], [11, 3], [11, 11],
      [4, 3], [4, 11], [10, 3], [10, 11],
      [3, 4], [3, 10], [11, 4], [11, 10],
    ],
  },
];

function createPresetMaze(presetIndex: number): { maze: MazeCell[][], start: Position, end: Position, width: number, height: number } {
  const preset = PRESET_MAZES[presetIndex % PRESET_MAZES.length];
  const { width, height, walls } = preset;
  
  const maze: MazeCell[][] = [];
  
  for (let z = 0; z < height; z++) {
    maze[z] = [];
    for (let x = 0; x < width; x++) {
      maze[z][x] = {
        x,
        z,
        isWall: false,
        isStart: false,
        isEnd: false,
        isPath: false,
        isVisited: false,
      };
    }
  }
  
  for (let x = 0; x < width; x++) {
    maze[0][x].isWall = true;
    maze[height - 1][x].isWall = true;
  }
  for (let z = 0; z < height; z++) {
    maze[z][0].isWall = true;
    maze[z][width - 1].isWall = true;
  }
  
  walls.forEach(([z, x]) => {
    if (z < height && x < width) {
      maze[z][x].isWall = true;
    }
  });
  
  const start: Position = { x: 1, z: 1 };
  const end: Position = { x: width - 2, z: height - 2 };
  
  maze[start.z][start.x].isStart = true;
  maze[start.z][start.x].isWall = false;
  maze[end.z][end.x].isEnd = true;
  maze[end.z][end.x].isWall = false;
  
  return { maze, start, end, width, height };
}

const initialMaze = createPresetMaze(0);

export const useMaze = create<MazeState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    selectedAlgorithm: null,
    maze: initialMaze.maze,
    mazeWidth: initialMaze.width,
    mazeHeight: initialMaze.height,
    startPos: initialMaze.start,
    endPos: initialMaze.end,
    path: [],
    visitedCells: [],
    ballPosition: initialMaze.start,
    pathIndex: 0,
    stats: null,
    visualizationMode: "instant",
    difficulty: "medium",
    visualizationIndex: 0,
    
    setAlgorithm: (algo) => set({ selectedAlgorithm: algo }),
    setVisualizationMode: (mode) => set({ visualizationMode: mode }),
    setDifficulty: (diff) => set({ difficulty: diff }),
    
    startGame: () => {
      const state = get();
      if (state.selectedAlgorithm) {
        set({ phase: "solving" });
      }
    },
    
    setPath: (path) => {
      const { maze } = get();
      const newMaze = maze.map(row => row.map(cell => ({ ...cell, isPath: false })));
      path.forEach(pos => {
        if (newMaze[pos.z] && newMaze[pos.z][pos.x]) {
          newMaze[pos.z][pos.x].isPath = true;
        }
      });
      set({ path, maze: newMaze });
    },
    
    setVisitedCells: (cells) => {
      const { maze } = get();
      const newMaze = maze.map(row => row.map(cell => ({ ...cell, isVisited: false })));
      cells.forEach(pos => {
        if (newMaze[pos.z] && newMaze[pos.z][pos.x]) {
          newMaze[pos.z][pos.x].isVisited = true;
        }
      });
      set({ visitedCells: cells, maze: newMaze });
    },
    
    storeVisitedCells: (cells) => {
      set({ visitedCells: cells });
    },
    
    setStats: (stats) => set({ stats }),
    
    startVisualization: () => {
      const { maze } = get();
      const newMaze = maze.map(row => row.map(cell => ({ ...cell, isVisited: false, isPath: false })));
      set({ phase: "visualizing", visualizationIndex: 0, maze: newMaze });
    },
    
    advanceVisualization: () => {
      const { visitedCells, visualizationIndex, maze, path } = get();
      if (visualizationIndex < visitedCells.length) {
        const newMaze = maze.map(row => row.map(cell => ({ ...cell })));
        const cell = visitedCells[visualizationIndex];
        if (newMaze[cell.z] && newMaze[cell.z][cell.x]) {
          newMaze[cell.z][cell.x].isVisited = true;
        }
        set({ maze: newMaze, visualizationIndex: visualizationIndex + 1 });
        return true;
      } else {
        const newMaze = maze.map(row => row.map(cell => ({ ...cell })));
        path.forEach(pos => {
          if (newMaze[pos.z] && newMaze[pos.z][pos.x]) {
            newMaze[pos.z][pos.x].isPath = true;
          }
        });
        set({ maze: newMaze });
        return false;
      }
    },
    
    startMoving: () => set({ phase: "moving", pathIndex: 0 }),
    
    moveBall: () => {
      const { path, pathIndex } = get();
      if (pathIndex < path.length) {
        set({ 
          ballPosition: path[pathIndex], 
          pathIndex: pathIndex + 1 
        });
        return true;
      }
      return false;
    },
    
    complete: () => set({ phase: "completed" }),
    
    restart: () => {
      const { difficulty } = get();
      const size = DIFFICULTY_SIZES[difficulty];
      const newMaze = generateRandomMaze(size.width, size.height);
      set({
        phase: "menu",
        selectedAlgorithm: null,
        maze: newMaze.maze,
        mazeWidth: size.width,
        mazeHeight: size.height,
        startPos: newMaze.start,
        endPos: newMaze.end,
        path: [],
        visitedCells: [],
        ballPosition: newMaze.start,
        pathIndex: 0,
        stats: null,
        visualizationIndex: 0,
      });
    },
    
    generateMaze: () => {
      const { difficulty } = get();
      const size = DIFFICULTY_SIZES[difficulty];
      const newMaze = generateRandomMaze(size.width, size.height);
      set({
        maze: newMaze.maze,
        mazeWidth: size.width,
        mazeHeight: size.height,
        startPos: newMaze.start,
        endPos: newMaze.end,
        ballPosition: newMaze.start,
        path: [],
        visitedCells: [],
        pathIndex: 0,
        stats: null,
        visualizationIndex: 0,
      });
    },
    
    loadPresetMaze: (preset) => {
      const presetMaze = createPresetMaze(preset);
      set({
        maze: presetMaze.maze,
        mazeWidth: presetMaze.width,
        mazeHeight: presetMaze.height,
        startPos: presetMaze.start,
        endPos: presetMaze.end,
        ballPosition: presetMaze.start,
        path: [],
        visitedCells: [],
        pathIndex: 0,
        stats: null,
        visualizationIndex: 0,
      });
    },
  }))
);
