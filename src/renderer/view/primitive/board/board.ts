import { BoardImageType, BoardLabelType, PromotionSelectorStyle } from "@/common/settings/app.js";
import { Config } from "./config.js";
import { boardParams, commonParams } from "./params.js";
import { Color, ImmutableBoard, Move, Piece, PieceType, reverseColor, Square, Position, Direction, MoveType, resolveMoveType, movableDirections } from "tsshogi";
import {
  Board,
  BoardBackground,
  BoardLabel,
  BoardPiece,
  BoardSquare,
  Promotion,
} from "./layout.js";
import { Point } from "@/common/assets/geometry.js";

const boardBackgroundColorMap = {
  [BoardImageType.LIGHT]: "rgba(0, 0, 0, 0)",
  [BoardImageType.LIGHT2]: "rgba(0, 0, 0, 0)",
  [BoardImageType.LIGHT3]: "rgba(0, 0, 0, 0)",
  [BoardImageType.WARM]: "rgba(0, 0, 0, 0)",
  [BoardImageType.WARM2]: "rgba(0, 0, 0, 0)",
  [BoardImageType.RESIN]: "#d69b00",
  [BoardImageType.RESIN2]: "#efbf63",
  [BoardImageType.RESIN3]: "#ad7624",
  [BoardImageType.GREEN]: "#598459",
  [BoardImageType.CHERRY_BLOSSOM]: "#ecb6b6",
  [BoardImageType.AUTUMN]: "#d09f51",
  [BoardImageType.SNOW]: "#c3c0d3",
  [BoardImageType.DARK_GREEN]: "#465e5e",
  [BoardImageType.DARK]: "#333333",
  [BoardImageType.CUSTOM_IMAGE]: "rgba(0, 0, 0, 0)",
};

const rankCharMap: { [n: number]: string } = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "七",
  8: "八",
  9: "九",
};

// 将棋のコマの効きを計算する関数
function calculateAttackSquares(position: ImmutableBoard, color: Color): Set<number> {
  const attackSquares = new Set<number>();
  
  console.log(`calculateAttackSquares called for color: ${color === Color.BLACK ? 'BLACK' : 'WHITE'}`);
  
  // 盤上の各コマについて効きを計算
  for (const square of position.listNonEmptySquares()) {
    const piece = position.at(square) as Piece;
    if (piece.color !== color) {
      continue;
    }
    
    console.log(`Processing piece ${piece.type} at square ${square.index} (${square.x},${square.y})`);
    
    // 各コマの移動可能方向を取得
    const directions = movableDirections(piece);
    console.log(`  Directions for ${piece.type}:`, directions);
    
    for (const direction of directions) {
      const moveType = resolveMoveType(piece, direction);
      
      switch (moveType) {
        case MoveType.SHORT: {
          const to = square.neighbor(direction);
          if (to.valid) {
            attackSquares.add(to.index);
            console.log(`  Added short move to square ${to.index} (${to.x},${to.y})`);
          }
          break;
        }
        case MoveType.LONG:
          // 長距離移動（飛車、角、香車など）
          for (let to = square.neighbor(direction); to.valid; to = to.neighbor(direction)) {
            attackSquares.add(to.index);
            console.log(`  Added long move to square ${to.index} (${to.x},${to.y})`);
            // 他のコマにぶつかったら停止
            if (position.at(to)) {
              console.log(`  Stopped at square ${to.index} due to piece`);
              break;
            }
          }
          break;
      }
    }
  }
  
  console.log(`Final attack squares for ${color === Color.BLACK ? 'BLACK' : 'WHITE'}:`, attackSquares);
  return attackSquares;
}

export class BoardLayoutBuilder {
  constructor(
    private config: Config,
    private ratio: number,
  ) {}

  centerOfSquare(square: Square): Point {
    const x =
      (boardParams.leftSquarePadding +
        boardParams.squareWidth * ((this.config.flip ? square.opposite : square).x + 0.5)) *
      this.ratio;
    const y =
      (boardParams.topSquarePadding +
        boardParams.squareHeight * ((this.config.flip ? square.opposite : square).y + 0.5)) *
      this.ratio;
    return new Point(x, y);
  }

  private get background(): BoardBackground {
    const bgColor = boardBackgroundColorMap[this.config.boardImageType];
    const style = {
      "background-color": bgColor,
      left: "0px",
      top: "0px",
      height: boardParams.height * this.ratio + "px",
      width: boardParams.width * this.ratio + "px",
      opacity: this.config.boardImageOpacity.toString(),
    };
    return {
      gridColor: this.config.boardGridColor,
      textureImagePath: this.config.boardTextureImage,
      style,
    };
  }

  private get labels(): BoardLabel[] {
    if (this.config.boardLabelType == BoardLabelType.NONE) {
      return [];
    }
    const labels: BoardLabel[] = [];
    const fontSize = boardParams.label.fontSize * this.ratio;
    const shadow = fontSize * 0.1;
    const commonStyle = {
      color: "black",
      "font-size": fontSize + "px",
      "font-weight": "bold",
      "text-shadow": `${shadow}px ${shadow}px  ${shadow}px white`,
    };
    for (let rank = 1; rank <= 9; rank++) {
      const x =
        boardParams.leftPiecePadding * 0.5 * this.ratio * (this.config.flip ? 1 : -1) -
        fontSize * 0.5 +
        (this.config.flip ? 0 : boardParams.width) * this.ratio;
      const y =
        (boardParams.topSquarePadding +
          ((this.config.flip ? 10 - rank : rank) - 0.5) * boardParams.squareHeight) *
          this.ratio -
        fontSize * 0.5;
      labels.push({
        id: "rank" + rank,
        character: rankCharMap[rank],
        style: {
          left: x + "px",
          top: y + "px",
          ...commonStyle,
        },
      });
    }
    for (let file = 1; file <= 9; file++) {
      const x =
        (boardParams.leftPiecePadding +
          (9.5 - (this.config.flip ? 10 - file : file)) * boardParams.squareWidth) *
          this.ratio -
        fontSize * 0.5;
      const y =
        (this.config.flip ? boardParams.height : 0) * this.ratio +
        boardParams.topSquarePadding * 0.7 * this.ratio * (this.config.flip ? -1 : 1) -
        fontSize * 0.6;
      labels.push({
        id: "file" + file,
        character: String(file),
        style: {
          left: x + "px",
          top: y + "px",
          ...commonStyle,
        },
      });
    }
    return labels;
  }

  private getPieces(board: ImmutableBoard): BoardPiece[] {
    const pieces: BoardPiece[] = [];
    board.listNonEmptySquares().forEach((square: Square) => {
      const piece = board.at(square) as Piece;
      const id = piece.id + square.index;
      const displayColor = this.config.flip ? reverseColor(piece.color) : piece.color;
      const pieceType =
        piece.type == PieceType.KING && piece.color == Color.BLACK ? "king2" : piece.type;
      const imagePath = this.config.pieceImages[displayColor][pieceType];
      const x =
        (boardParams.leftPiecePadding +
          boardParams.squareWidth * (this.config.flip ? square.opposite : square).x) *
        this.ratio;
      const y =
        (boardParams.topPiecePadding +
          boardParams.squareHeight * (this.config.flip ? square.opposite : square).y) *
        this.ratio;
      const width = commonParams.piece.width * this.ratio;
      const height = commonParams.piece.height * this.ratio;
      pieces.push({
        id,
        imagePath,
        style: {
          left: x + "px",
          top: y + "px",
          width: width + "px",
          height: height + "px",
        },
      });
    });
    return pieces;
  }

  private getSquares(lastMove?: Move | null, pointer?: Square | Piece | null): BoardSquare[] {
    const squares: BoardSquare[] = [];
    
    // 現在の局面の効きを計算
    const currentPosition = this.config.position;
    let blackAttackSquares: Set<number> | null = null;
    let whiteAttackSquares: Set<number> | null = null;
    
    // デバッグ用ログ
    console.log("BoardLayoutBuilder.getSquares - currentPosition:", currentPosition);
    console.log("BoardLayoutBuilder.getSquares - showAttackSquares enabled:", !!currentPosition);
    
    if (currentPosition) {
      blackAttackSquares = calculateAttackSquares(currentPosition.board, Color.BLACK);
      whiteAttackSquares = calculateAttackSquares(currentPosition.board, Color.WHITE);
      
      // デバッグ用ログ
      console.log("BoardLayoutBuilder.getSquares - blackAttackSquares:", blackAttackSquares);
      console.log("BoardLayoutBuilder.getSquares - whiteAttackSquares:", whiteAttackSquares);
    }
    
    Square.all.forEach((square: Square) => {
      const id = square.index;
      const { file } = square;
      const { rank } = square;
      const x =
        (boardParams.leftSquarePadding +
          boardParams.squareWidth * (this.config.flip ? square.opposite : square).x) *
        this.ratio;
      const y =
        (boardParams.topSquarePadding +
          boardParams.squareHeight * (this.config.flip ? square.opposite : square).y) *
        this.ratio;
      const width = boardParams.squareWidth * this.ratio;
      const height = boardParams.squareHeight * this.ratio;
      const style = {
        left: x + "px",
        top: y + "px",
        width: width + "px",
        height: height + "px",
      };
      let backgroundStyle: { [key: string]: string } = style;
      
      // 効きの表示
      if (blackAttackSquares && whiteAttackSquares) {
        const isBlackAttack = blackAttackSquares.has(square.index);
        const isWhiteAttack = whiteAttackSquares.has(square.index);
        
        // デバッグ用ログ（最初の数マスのみ）
        if (square.index < 5) {
          console.log(`Square ${square.index} (${file},${rank}): black=${isBlackAttack}, white=${isWhiteAttack}`);
        }
        
        if (isBlackAttack && isWhiteAttack) {
          // 両方のコマが効いている場合は紫
          backgroundStyle = {
            ...backgroundStyle,
            backgroundColor: "#800080",
            opacity: "0.6",
          };
        } else if (isBlackAttack) {
          // 先手（黒）のコマが効いている場合は青
          backgroundStyle = {
            ...backgroundStyle,
            backgroundColor: "#0000ff",
            opacity: "0.4",
          };
        } else if (isWhiteAttack) {
          // 後手（白）のコマが効いている場合は赤
          backgroundStyle = {
            ...backgroundStyle,
            backgroundColor: "#ff0000",
            opacity: "0.4",
          };
        }
      }
      
      if (lastMove && square.equals(lastMove.to)) {
        backgroundStyle = {
          ...backgroundStyle,
          ...boardParams.highlight.lastMoveTo,
        };
      }
      if (lastMove && lastMove.from instanceof Square && square.equals(lastMove.from)) {
        backgroundStyle = {
          ...backgroundStyle,
          ...boardParams.highlight.lastMoveFrom,
        };
      }
      if (pointer instanceof Square && pointer.equals(square)) {
        backgroundStyle = {
          ...backgroundStyle,
          ...boardParams.highlight.selected,
        };
      }
      squares.push({
        id,
        file,
        rank,
        style,
        backgroundStyle,
      });
    });
    return squares;
  }

  private getPromotionControls(move?: Move | null): [Promotion | null, Promotion | null] {
    if (!move) {
      return [null, null];
    }
    const color = this.config.flip ? reverseColor(move.color) : move.color;
    const square = this.config.flip ? move.to.opposite : move.to;
    const piece = new Piece(color, move.pieceType);
    const promoted = piece.promoted();
    const notPromoted = piece.unpromoted();
    const promoteImagePath = this.config.pieceImages[color][promoted.type];
    const notPromoteImagePath = this.config.pieceImages[color][notPromoted.type];
    const width = boardParams.squareWidth * this.ratio;
    const height = boardParams.squareHeight * this.ratio;
    let x1, y1, x2, y2: number;
    switch (this.config.promotionSelectorStyle) {
      case PromotionSelectorStyle.HORIZONTAL:
        x1 =
          (boardParams.leftSquarePadding +
            boardParams.squareWidth * (square.x === 0 ? 0 : square.x === 8 ? 7 : square.x - 0.5)) *
          this.ratio;
        y1 = y2 = (boardParams.topSquarePadding + boardParams.squareHeight * square.y) * this.ratio;
        x2 = x1 + width;
        break;
      case PromotionSelectorStyle.VERTICAL_PREFER_BOTTOM:
        x1 = x2 = (boardParams.leftSquarePadding + boardParams.squareWidth * square.x) * this.ratio;
        y1 = (boardParams.topSquarePadding + boardParams.squareHeight * square.y) * this.ratio;
        y2 = y1 + (square.y === 8 ? -height : height);
        break;
      case PromotionSelectorStyle.HORIZONTAL_PREFER_RIGHT:
        x1 = (boardParams.leftSquarePadding + boardParams.squareWidth * square.x) * this.ratio;
        y1 = y2 = (boardParams.topSquarePadding + boardParams.squareHeight * square.y) * this.ratio;
        x2 = x1 + (square.x === 8 ? -width : width);
        break;
    }
    const promoteStyle = {
      left: x1 + "px",
      top: y1 + "px",
      width: width + "px",
      height: height + "px",
    };
    const doNotPromoteStyle = {
      left: x2 + "px",
      top: y2 + "px",
      width: width + "px",
      height: height + "px",
    };
    return [
      { imagePath: promoteImagePath, style: promoteStyle },
      { imagePath: notPromoteImagePath, style: doNotPromoteStyle },
    ];
  }

  build(
    board: ImmutableBoard,
    lastMove?: Move | null,
    pointer?: Square | Piece | null,
    reservedMoveForPromotion?: Move | null,
  ): Board {
    const [promote, doNotPromote] = this.getPromotionControls(reservedMoveForPromotion);
    return {
      background: this.background,
      labels: this.labels,
      pieces: this.getPieces(board),
      squares: this.getSquares(lastMove, pointer),
      promote,
      doNotPromote,
    };
  }
}
