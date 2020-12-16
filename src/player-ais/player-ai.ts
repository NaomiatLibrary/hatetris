'use strict'

import Game from './../components/Game/Game.tsx'
import type { GameWellState } from './../components/Game/Game.tsx'

const moves = ['L', 'R', 'D', 'U']

interface Options {
  searchDepth: number
}
//https://www.ieice.org/iss/jpn/Publications/issposter_2015/data/pdf/ISS-P-51.pdf
const PlayerAi = (options: Options) => (game: Game) => {
    const {
      rotationSystem,
      wellDepth,
      wellWidth
    } = game.props
  //次の盤面を全て算出
  //パラメータを使ってそれらの盤面のスコアを算出
  //一番いい盤面になるように動かす
  //ゲームオーバーになったときスコアとパラメータを記録
  //100個プレイが溜まったら交配
  //繰り返す

  /**
    Generate a unique integer to describe the position and orientation of this piece.
    `x` varies between -3 and (`wellWidth` - 1) inclusive, so range = `wellWidth` + 3
    `y` varies between 0 and (`wellDepth` + 2) inclusive, so range = `wellDepth` + 3
    `o` varies between 0 and 3 inclusive, so range = 4
  */
 const hashCode = (x: number, y: number, o: number) =>
 (x * (wellDepth + 3) + y) * 4 + o

/**
 Given a well and a piece ID, find all possible places where it could land
 and return the array of "possible future" states. All of these states
 will have `null` `piece` because the piece is landed; some will have
 an increased `score`.
*/
  const getPossibleFutures = (well: number[], pieceId: number, score:number): GameWellState[] => {
    let piece = rotationSystem.placeNewPiece(wellWidth, pieceId)

    // move the piece down to a lower position before we have to
    // start pathfinding for it
    // move through empty rows
    while (
      piece.y + 4 < wellDepth && // piece is above the bottom
      well[piece.y + 4] === 0 // nothing immediately below it
    ) {
      piece = game.getNextState({
        well: well,
        score: 0,
        piece: piece
      }, 'D').piece
    }

    // push first position
    const piecePositions = [piece]

    const seen = new Set()
    seen.add(hashCode(piece.x, piece.y, piece.o))

    const possibleFutures: GameWellState[] = []

    // a simple for loop won't work here because
    // we are increasing the list as we go
    let i = 0
    while (i < piecePositions.length) {
      piece = piecePositions[i]

      // apply all possible moves
      moves.forEach(move => {
        const nextState = game.getNextState({
          well: well,
          score: score,
          piece: piece
        }, move)
        const newPiece = nextState.piece

        if (newPiece === null) {
          // piece locked? better add that to the list
          // do NOT check locations, they aren't significant here
          possibleFutures.push(nextState)
        } else {
          // transform succeeded?
          // new location? append to list
          // check locations, they are significant
          const newHashCode = hashCode(newPiece.x, newPiece.y, newPiece.o)

          if (!seen.has(newHashCode)) {
            piecePositions.push(newPiece)
            seen.add(newHashCode)
          }
        }
      })
      i++
    }

    return possibleFutures
  }
  const calculateScore = (well:GameWellState,params:number[]): number =>{
    let deadspace = 0 //デットスペース(上下がブロックに囲まれている)の数
    let outstanding = 0 //突出した高低さ(平均との差が4以上)をもつ列の数
    let heightdiff = 0 //高低差の合計和
    //let fourspace = 0 //壁沿い縦４マス以上のスペースがあるかどうか
    //ßconsole.log(well.well[0])
    for (var y = 0; y < 20; y++) {
      for (var x = 0; x < 10; x++){
        let isthisspace = (well.well[y] >> x ) & 1
        let isupblockorwall = y>0? (well.well[y-1] >> x ) & 1 : 0
        let isdownblockorwall = y<20 ? (well.well[y+1] >> x ) & 1 : 1
        deadspace += isthisspace*isupblockorwall*isdownblockorwall
      }
    }

    //高さを記録する配列
    let heights:number[] = [0,0,0,0,0,0,0,0,0,0]
    for (var y = 0; y < 20; y++) {
      for (var x = 0; x < 10; x++){
        if( ((well.well[y] >> x ) & 1) == 1){
          if(heights[x]<20-y)heights[x]=20-y;
        }
      }
    }
    //高さの平均
    let ave=0
    for(let height of heights)ave+=height
    ave=ave/20
    //平均値から４以上高い/低い
    for (var x = 0; x < 10; x++){
      if(heights[x]>=ave+4 || heights[x]<=ave-4)outstanding+=1
    }
    //高低差
    for (var x = 0; x < 9; x++){
      heightdiff=Math.abs(heights[x]-heights[x+1])
    }
    return deadspace*params[0]+outstanding*params[1]+heightdiff*params[2]
  }
  const calculateHand = (well:GameWellState) : string[] =>{
    return ["D","L","D","L"]
  }
  const pickHand = (well: GameWellState,param:number[]): GameWellState => {
    //console.log(game)
    //console.log(well)
    //console.log(well)
    //console.log( calculateScore(well,[10,10,10]) )
    let possibleFutures=getPossibleFutures(well.well,well.piece.id,well.score)
    let maxscore=-1001001001
    let maxfuture=undefined
    possibleFutures.forEach(future => {
      let score=calculateScore(future,param)
      if(maxscore<score){
        maxfuture=future
        maxscore=score
      }
    })
    //let move=moves[Math.floor(Math.random() * Math.floor(4))]
    //console.log(move)
    return maxfuture
  }

  return (well: GameWellState,param:number[]): GameWellState => pickHand(well,param)
  }
  
  export const Player0 = PlayerAi({ searchDepth: 0 })