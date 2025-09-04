import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';

// Theme colors
const COLORS = {
  primary: '#1976d2',
  secondary: '#90caf9',
  accent: '#ff4081',
  bg: '#ffffff',
  text: '#0f172a',
  subtext: '#475569',
  border: '#e2e8f0',
  shadow: '#00000020',
};

// Types
type CellValue = 'X' | 'O' | null;
type Board = CellValue[];
type Mode = 'PvP' | 'PvAI';

type WinResult =
  | {
      winner: 'X' | 'O';
      line: [number, number, number];
    }
  | {
      winner: null; // draw or ongoing
      line?: undefined;
    };

// Utilities
const LINES: [number, number, number][] = [
  [0, 1, 2], // rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // cols
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // diagonals
  [2, 4, 6],
];

function checkWinner(board: Board): WinResult {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  // Not winner yet - if no empty cells -> draw/ongoing handled outside
  return { winner: null };
}

function getEmptyIndices(board: Board): number[] {
  const empty: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) empty.push(i);
  }
  return empty;
}

// Simple minimax with pruning for Tic Tac Toe (small state space)
function minimax(board: Board, isMaximizing: boolean, ai: 'X' | 'O', human: 'X' | 'O'): { score: number; move: number | null } {
  const { winner } = checkWinner(board);
  const empty = getEmptyIndices(board);
  const isBoardFull = empty.length === 0;

  // Terminal evaluation
  if (winner === ai) return { score: 10, move: null };
  if (winner === human) return { score: -10, move: null };
  if (isBoardFull) return { score: 0, move: null };

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove: number | null = null;
    for (const idx of empty) {
      board[idx] = ai;
      const result = minimax(board, false, ai, human);
      board[idx] = null;
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = idx;
      }
    }
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove: number | null = null;
    for (const idx of empty) {
      board[idx] = human;
      const result = minimax(board, true, ai, human);
      board[idx] = null;
      if (result.score < bestScore) {
        bestScore = result.score;
        bestMove = idx;
      }
    }
    return { score: bestScore, move: bestMove };
  }
}

// Components
function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <View style={styles.segmentRoot}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.segmentItem,
              selected && styles.segmentItemSelected,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScoreCard({
  x,
  o,
  draws,
}: {
  x: number;
  o: number;
  draws: number;
}) {
  return (
    <View style={styles.scoreRow}>
      <View style={[styles.scoreBox, { backgroundColor: COLORS.secondary }]}>
        <Text style={styles.scoreLabel}>X</Text>
        <Text style={styles.scoreValue}>{x}</Text>
      </View>
      <View style={[styles.scoreBox, { backgroundColor: '#f1f5f9' }]}>
        <Text style={[styles.scoreLabel, { color: COLORS.subtext }]}>Draw</Text>
        <Text style={[styles.scoreValue, { color: COLORS.subtext }]}>{draws}</Text>
      </View>
      <View style={[styles.scoreBox, { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent + '55' }]}>
        <Text style={[styles.scoreLabel, { color: COLORS.accent }]}>O</Text>
        <Text style={[styles.scoreValue, { color: COLORS.accent }]}>{o}</Text>
      </View>
    </View>
  );
}

function Cell({
  value,
  isWinning,
  onPress,
}: {
  value: CellValue;
  isWinning?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        isWinning && { backgroundColor: COLORS.secondary },
        pressed && { backgroundColor: '#e6f0fb' },
      ]}
      android_ripple={{ color: '#e6f0fb' }}
    >
      <Text
        style={[
          styles.cellText,
          value === 'X' && { color: COLORS.primary },
          value === 'O' && { color: COLORS.accent },
        ]}
      >
        {value ?? ''}
      </Text>
    </Pressable>
  );
}

function BoardGrid({
  board,
  winningLine,
  onCellPress,
}: {
  board: Board;
  winningLine?: [number, number, number];
  onCellPress: (index: number) => void;
}) {
  const winSet = useMemo(() => new Set(winningLine ?? []), [winningLine]);

  // Render grid using FlatList for consistency; 3x3
  return (
    <View style={styles.grid}>
      {board.map((val, idx) => (
        <Cell
          key={idx}
          value={val}
          isWinning={winSet.has(idx)}
          onPress={() => onCellPress(idx)}
        />
      ))}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'secondary';
}) {
  const styleByVariant = useMemo(() => {
    switch (variant) {
      case 'outline':
        return {
          container: {
            borderColor: COLORS.primary,
            borderWidth: 1,
            backgroundColor: 'transparent',
          },
          text: { color: COLORS.primary },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: COLORS.accent,
          },
          text: { color: '#fff' },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: COLORS.secondary,
          },
          text: { color: COLORS.primary },
        };
      default:
        return {
          container: { backgroundColor: COLORS.primary },
          text: { color: '#fff' },
        };
    }
  }, [variant]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styleByVariant.container,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
      ]}
      android_ripple={{ color: '#ffffff40' }}
    >
      <Text style={[styles.buttonText, styleByVariant.text]}>{label}</Text>
    </Pressable>
  );
}

// PUBLIC_INTERFACE
function App(): JSX.Element {
  /**
   * Main Tic Tac Toe app component.
   * Provides:
   * - Mode selection: PvP or PvAI
   * - 3x3 grid with win highlighting
   * - Status display: turn, winner, or draw
   * - Controls: Reset scores, Replay game
   * - Local score tracking
   */
  const { width } = useWindowDimensions();
  const gridSize = Math.min(380, width - 32); // responsive grid

  const [mode, setMode] = useState<Mode>('PvP');
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [winnerInfo, setWinnerInfo] = useState<WinResult>({ winner: null });
  const [isDraw, setIsDraw] = useState(false);

  const [score, setScore] = useState<{ X: number; O: number; D: number }>({
    X: 0,
    O: 0,
    D: 0,
  });

  const currentPlayer: 'X' | 'O' = xIsNext ? 'X' : 'O';

  const emptyCells = useMemo(() => getEmptyIndices(board), [board]);

  // Determine status text
  const statusText = useMemo(() => {
    if (winnerInfo.winner) {
      return `Winner: ${winnerInfo.winner}`;
    }
    if (isDraw) {
      return 'Draw';
    }
    if (mode === 'PvAI' && currentPlayer === 'O') {
      return 'AI thinking...';
    }
    return `Turn: ${currentPlayer}`;
  }, [winnerInfo, isDraw, currentPlayer, mode]);

  // Handle cell press
  const handleCellPress = useCallback(
    (index: number) => {
      if (board[index] || winnerInfo.winner || isDraw) return;

      const next = [...board];
      next[index] = currentPlayer;
      setBoard(next);
      setXIsNext((prev) => !prev);
    },
    [board, currentPlayer, winnerInfo, isDraw]
  );

  // Detect winner / draw after any move
  useEffect(() => {
    const res = checkWinner(board);
    if (res.winner) {
      setWinnerInfo(res);
      setIsDraw(false);
      setScore((s) => ({ ...s, [res.winner as 'X' | 'O']: s[res.winner as 'X' | 'O'] + 1 }));
      return;
    }
    if (emptyCells.length === 0) {
      setIsDraw(true);
      setWinnerInfo({ winner: null });
      setScore((s) => ({ ...s, D: s.D + 1 }));
      return;
    }
    setWinnerInfo({ winner: null });
    setIsDraw(false);
  }, [board, emptyCells.length]);

  // AI move (O) when in PvAI and it's O's turn
  useEffect(() => {
    if (mode !== 'PvAI') return;
    if (winnerInfo.winner || isDraw) return;
    if (currentPlayer !== 'O') return;

    // small delay for UX
    const t = setTimeout(() => {
      const ai = 'O';
      const human = 'X';
      const { move } = minimax([...board], true, ai, human);
      const aiMove = move ?? (getEmptyIndices(board)[0] ?? null);
      if (aiMove !== null) {
        handleCellPress(aiMove);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [mode, currentPlayer, board, handleCellPress, winnerInfo, isDraw]);

  const replay = useCallback(() => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinnerInfo({ winner: null });
    setIsDraw(false);
  }, []);

  const resetAll = useCallback(() => {
    replay();
    setScore({ X: 0, O: 0, D: 0 });
  }, [replay]);

  const onChangeMode = useCallback(
    (val: string) => {
      setMode(val as Mode);
      // Reset board when switching mode to avoid AI being mid-turn
      replay();
    },
    [replay]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
      <View style={styles.container}>
        <Header title="Tic Tac Toe" subtitle="Classic 3x3 · Minimal" />

        <SegmentedControl options={['PvP', 'PvAI']} value={mode} onChange={onChangeMode} />

        <ScoreCard x={score.X} o={score.O} draws={score.D} />

        <View style={[styles.statusBox]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <View style={[styles.gridContainer, { width: gridSize, height: gridSize }]}>
          <BoardGrid
            board={board}
            winningLine={winnerInfo.line}
            onCellPress={handleCellPress}
          />
        </View>

        <View style={styles.controlsRow}>
          <PrimaryButton label="Replay" onPress={replay} variant="secondary" />
          <PrimaryButton label="Reset Scores" onPress={resetAll} variant="danger" />
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Primary: {COLORS.primary} · Accent: {COLORS.accent} · Secondary: {COLORS.secondary}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default App;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 16,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 4,
  },
  segmentRoot: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  segmentItemSelected: {
    backgroundColor: COLORS.secondary,
  },
  segmentText: {
    color: COLORS.subtext,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: COLORS.primary,
  },
  scoreRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  scoreBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  scoreValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusBox: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f8fafc',
  },
  statusText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  gridContainer: {
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#f1f5f9',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  cell: {
    width: '33.3333%',
    height: '33.3333%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  cellText: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerNote: {
    marginTop: 'auto',
    marginBottom: 8,
  },
  footerText: {
    color: COLORS.subtext,
    fontSize: 11,
  },
});
