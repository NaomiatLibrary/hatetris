'use strict'

import Game from './../components/Game/Game.tsx'
import type { GameWellState } from './../components/Game/Game.tsx'

const moves = ['L', 'R', 'D', 'U']

interface Options {
  searchDepth: number
}
class Queue {
  private data:any[] = [];
  push(item:any) { this.data.push(item); }
  pop() { return this.data.shift(); }
  size() {return this.data.length}
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
  const getHighestBlue = (well: number[]): number => {
    let row
    for (row = 0; row < well.length; row++) {
      if (well[row] !== 0) {
        break
      }
    }
    return row
  }

  // deeper lines are worth less than immediate lines
  // this is so the game will never give you a line if it can avoid it
  // NOTE: make sure rating doesn't return a range of more than 100 values...
  const getWellRating = (well: number[], depthRemaining: number): number =>
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    getHighestBlue(well) + (depthRemaining === 0 ? 0 : getWorstPieceDetails(well, depthRemaining - 1).rating / 100)

  /**
    Given a well and a piece, find the best possible location to put it.
    Return the best rating found.
  */
  const getBestWellRating = (well: number[], pieceId: number, depthRemaining: number): number =>
    Math.max.apply(Math, getPossibleFutures(well, pieceId,0).map(possibleFuture =>
      getWellRating(possibleFuture.well, depthRemaining)
    ))

  // pick the worst piece that could be put into this well
  const getWorstPieceDetails = (well: number[], depthRemaining: number): {
    pieceId: number,
    rating: number
  } =>
    Object
      .keys(rotationSystem.rotations)
      .map(pieceId => ({
        pieceId: Number(pieceId),
        rating: getBestWellRating(well, Number(pieceId), depthRemaining)
      }))
      .sort((a, b) => a.rating - b.rating)[0]

  const calculateScore = (well:GameWellState,params:number[]): number =>{
    let deadspace = 0 //デットスペース(上下がブロックに囲まれている)の数
    let outstanding = 0 //突出した高低さ(平均との差が4以上)をもつ列の数
    let heightdiff = 0 //高低差の合計和
    let highest = 0 //積まれているブロックの最大の高さ
    let aveheight = 0 //積まれているブロックの高さの平均値
    let deletelow = 0 //消せる列の数
    //let fourspace = 0 //壁沿い縦４マス以上のスペースがあるかどうか
    //ßconsole.log(well.well[0])
    for (var y = 0; y < 20; y++) {
      let cntblock=0
      for (var x = 0; x < 10; x++){
        let isthisspace = (well.well[y] >> x ) & 1
        if(!isthisspace)cntblock+=1
        let isupblockorwall = y>0? (well.well[y-1] >> x ) & 1 : 0
        let isdownblockorwall = y<20 ? (well.well[y+1] >> x ) & 1 : 1
        deadspace += isthisspace*isupblockorwall*isdownblockorwall
      }
      if(cntblock==10)deletelow+=1
    }

    //高さを記録する配列
    let heights:number[] = [0,0,0,0,0,0,0,0,0,0]
    for (var y = 0; y < 20; y++) {
      for (var x = 0; x < 10; x++){
        if( ((well.well[y] >> x ) & 1) == 1){
          if(heights[x]<20-y)heights[x]=20-y;
          highest=Math.max(highest,heights[x])
        }
      }
    }
    //高さの平均
    for(let height of heights)aveheight+=height
    aveheight=aveheight/20
    //平均値から４以上高い/低い
    for (var x = 0; x < 10; x++){
      if(heights[x]>=aveheight+4 || heights[x]<=aveheight-4)outstanding+=1
    }
    //高低差
    for (var x = 0; x < 9; x++){
      heightdiff=Math.abs(heights[x]-heights[x+1])
    }
    return deadspace*params[0]+outstanding*params[1]+heightdiff*params[2]+highest*params[3]+aveheight*params[4]+deletelow*params[5]
  }
  const pickHand = (well: GameWellState,param:number[]): GameWellState => {
    //パラメータを使ってビームサーチを行う
    let maxfutureid=0
    let maxscore=-1001001001
    const queue = new Queue();

    let possiblenextFutures=getPossibleFutures(well.well,well.piece.id,well.score)
    let scoretofutureid:any[] =[]
    for(var i=0;i<possiblenextFutures.length;i++){
      scoretofutureid.push({'id':i,'score':calculateScore(possiblenextFutures[i],param)})
    }
    scoretofutureid = scoretofutureid.sort(function (a, b): any {
      const scoreA = new Number(a['score']);
      const scoreB = new Number(b['score']);
      return scoreB > scoreA ? 1 : scoreB < scoreA ? -1 : 0; //sort by score decending
    });
    scoretofutureid.slice(0,5).forEach(future=>{
      possiblenextFutures[future['id']].piece=rotationSystem.placeNewPiece(wellWidth, getWorstPieceDetails(possiblenextFutures[future['id']].well,0).pieceId)
      queue.push([0+future["score"],1,possiblenextFutures[future['id']],future['id']])
    })
    
    while(queue.size()>0){
      let q_poped=queue.pop()
      if(q_poped[1]>=3){//深さが3に達したら終わる
        if(q_poped[0]>maxscore){
          maxfutureid=q_poped[3]
          maxscore=q_poped[0]
        }
        break
      }
      let possibleFutures=getPossibleFutures(q_poped[2].well,q_poped[2].piece.id,q_poped[2].score)
      let scoretofuture:any[] =[]
      for(var i=0;i<possibleFutures.length;i++){
        scoretofuture.push({'future':possibleFutures[i],'score':calculateScore(possibleFutures[i],param)})
      }
      scoretofuture = scoretofuture.sort(function (a, b): any {
        const scoreA = new Number(a['score']);
        const scoreB = new Number(b['score']);
        return scoreB > scoreA ? 1 : scoreB < scoreA ? -1 : 0; //sort by score decending
      });
      scoretofuture.slice(0,5).forEach(future=>{
        //次のピース
        future["future"].piece=rotationSystem.placeNewPiece(wellWidth, getWorstPieceDetails(future["future"].well,0).pieceId)
        //future["future"].piece=rotationSystem.placeNewPiece(wellWidth, 0)
        queue.push([q_poped[0]+future["score"],q_poped[1]+1,future["future"],q_poped[3]])
      })
    }
    
   
    //let move=moves[Math.floor(Math.random() * Math.floor(4))]

    return possiblenextFutures[maxfutureid]
  }

  return (well: GameWellState,param:number[]): GameWellState => pickHand(well,param)
  }
  
  export const Player0 = PlayerAi({ searchDepth: 0 })