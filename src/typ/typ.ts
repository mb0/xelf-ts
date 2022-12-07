import {knd} from '../knd'

export interface Type {
	kind:number
	id:number
	ref?:string
	body?:Body
}

export type Body = Type|AltBody|ConstBody|ParamBody

export interface AltBody {
	alts:Type[]
}
export interface ParamBody {
	params:Param[]
}
export interface ConstBody {
	consts:Const[]
}

export interface Param {
	name?:string
	typ:Type
}
export interface Const {
	name:string
	val?:number
}

export function make(k:number, body?:Body, id?:number):Type { return {kind:k, id: id||0, body} }
export function has(t:Type, k:number) { return (t.kind&k) != 0 }
export function deopt(t:Type):Type {
	return !has(t, knd.none) ? t : {kind:t.kind&~knd.none, body:t.body, id:t.id, ref:t.ref}
}

export function equal(a?:Type, b?:Type, stack?:[Body,Body][]):boolean {
	if (!a||!b) return a == b
	if (a.id != b.id) return false
	if (a.kind != b.kind) return false
	if (a.ref != b.ref) return false
	return equalBody(a.body, b.body, stack)
}
export function equalBody(a?:Body, b?:Body, stack?:[Body,Body][]):boolean {
	let r = false
	if (!a||!b) r = a == b
	else if (stack && stack.find(h => h[0] == a && h[1] == b)) return true
	else if ('kind' in a) r = 'kind' in b && equal(a, b, stack)
	else if ('alts' in a) r = 'alts' in b &&
		a.alts.length == b.alts.length && !a.alts.find((t,i) => !equal(t, b.alts[i]))
	else if ('consts' in a) r = 'consts' in b &&
		a.consts.length == b.consts.length && !a.consts.find((c,i) => {
			const o = b.consts[i]
			return c.name != o.name || c.val != o.val
		})
	else if ('params' in a && 'params' in b &&
			a.params.length == b.params.length) {
		let hist = (stack||[]).concat([[a, b]])
		r = !a.params.find((p,i) => {
			const o = b.params[i]
			return p.name != o.name || !equal(p.typ, o.typ, hist)
		})
	}
	return r
}

