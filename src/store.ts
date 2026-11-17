import {create} from 'zustand'
import type {Build} from './circuit'
type State={board:Build; back:Build[]; ahead:Build[]; commit:(b:Build)=>void; undo:()=>void; redo:()=>void}
export const useBoard=create<State>((set,get)=>({
 board:{},back:[],ahead:[],
 commit:board=>{const s=get();if(JSON.stringify(s.board)!==JSON.stringify(board))set({board,back:[...s.back,s.board],ahead:[]})},
 undo:()=>{const s=get();if(s.back.length)set({board:s.back.at(-1)!,back:s.back.slice(0,-1),ahead:[s.board,...s.ahead]})},
 redo:()=>{const s=get();if(s.ahead.length)set({board:s.ahead[0],ahead:s.ahead.slice(1),back:[...s.back,s.board]})},
}))
