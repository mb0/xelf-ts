import {knd} from '../knd'

export interface Type {
	kind:number
	id:number
	body?:Body
}

export type Body = ElBody|SelBody|RefBody|AltBody|ConstBody|ParamBody

export interface ElBody {
	el:Type
}
export interface SelBody {
	path:string
	sel:Type // void for local selects '.name', otherwise a var or ref .name|@1 .name|@foo
}
export interface RefBody {
	ref:string
}
export interface AltBody {
	alts:Type[]
}
export interface Param {
	name?:string
	typ:Type
}
export interface ParamBody {
	name:string
	params:Param[]
}
export interface Const {
	name:string
	val?:number
}
export interface ConstBody {
	name:string
	consts:Const[]
}

export function make(k:number, body?:Body, id?:number):Type { return {kind:k, id: id||0, body} }
export function has(t:Type, k:number) { return (t.kind&k) != 0 }
export function deopt(t:Type):Type {
	return !has(t, knd.none) ? t : make(t.kind&~knd.none, t.body, t.id)
}

export function equal(a?:Type, b?:Type, stack?:[Body,Body][]):boolean {
	if (!a||!b) return a == b
	if (a.id != b.id) return false
	if (a.kind != b.kind) return false
	return equalBody(a.body, b.body, stack)
}
export function equalBody(a?:Body, b?:Body, stack?:[Body,Body][]):boolean {
	let r = false
	if (!a||!b) r = a == b
	else if (stack && stack.find(h => h[0] == a && h[1] == b)) return true
	else if ('el' in a) r = 'el' in b && equal(a.el, b.el, stack)
	else if ('sel' in a) r = 'sel' in b && a.path == b.path && equal(a.sel, b.sel, stack)
	else if ('ref' in a) r = 'ref' in b && a.ref == b.ref
	else if ('alts' in a) r = 'alts' in b &&
		a.alts.length == b.alts.length && !a.alts.find((t,i) => !equal(t, b.alts[i]))
	else if ('consts' in a) r = 'consts' in b && a.name == b.name &&
		a.consts.length == b.consts.length && !a.consts.find((c,i) => {
			const o = b.consts[i]
			return c.name != o.name || c.val != o.val
		})
	else if ('params' in a && 'params' in b && a.name == b.name &&
			a.params.length == b.params.length) {
		let hist = (stack||[]).concat([[a, b]])
		r = !a.params.find((p,i) => {
			const o = b.params[i]
			return p.name != o.name || !equal(p.typ, o.typ, hist)
		})
	}
	return r
}

