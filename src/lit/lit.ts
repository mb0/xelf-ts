import {knd} from '../knd'
import {quote} from '../cor'
import {Src, AstErr} from '../ast'
import {Type, typ} from '../typ'

export interface Lit {
	typ:Type
	val:Val
	src?:Src
}

export type Val = null | boolean | number | string | Date | Type | List | Dict | Spec
export type List = Val[]
export type Dict = {[key:string]:Val}

interface Spec {
	name:string
	decl:Type
}

export const lit = {toStr, valStr, withSrc, zero, make}

function withSrc(a:Lit, src?:Src):Lit { return {typ:a.typ, val:a.val, src} }
function toStr(e:Lit, json?:boolean):string { return valStr(e.val, json) }
function valStr(v:Val, json?:boolean):string {
	let q = json ? '"' : '\''
	if (typeof v === "string")
		return quote(v, q)
	if (!v || typeof v === "number" || v === true)
		return JSON.stringify(v)
	if (v instanceof Date)
		return q + v.toISOString() + q
	let sep = json ? ',' : ' '
	if (Array.isArray(v)) {
		let r = '['
		let arr = v as List
		arr.forEach(e => {
			if (r.length > 1) r += sep
			r += valStr(e, json)
		})
		r += ']'
		return r
	}
	if ('kind' in v && 'id' in v) return quote(typ.toStr(v as Type), q)
	if ('decl' in v && 'name' in v) {
		let s = v as Spec
		let r = 'spec'
		let k = s.decl.kind&knd.spec
		if (k == knd.form) r = 'form'
		if (k == knd.func) r = 'func'
		return q+'('+ r +' '+ s.name +')'+q
	}
	if (v instanceof Object) {
		let r = '{'
		let obj = v as Dict
		Object.keys(obj).forEach(k => {
			if (r.length > 1) r += sep
			if (json) {
				r += quote(k, q)
			} else {
				r += k
			}
			r += ':'+ valStr(obj[k], json)
		})
		r += '}'
		return r
	}
	throw new Error("lit toString unknown literal "+ JSON.stringify(v))
}

function zero(e:Lit):boolean {
	if (!e) throw new AstErr("not a literal in zero", e)
	if (typ.has(e.typ, knd.typ))
		return !(e.val as Type).kind
	if (Array.isArray(e.val))
		return !e.val.length
	return !e.val
}

function make(t:Type, src?:Src):Lit {
	let k = t.kind&knd.all
	let val:Val
	if (k&knd.none) val = null
	else if (k == knd.typ) val = typ.void
	else if (k&knd.num) val = 0
	else if ((k&knd.char)==knd.time) val = new Date()
	else if (k&knd.char) val = ''
	else if (k&knd.tupl) val = []
	else if (k&knd.keyr) val = {}
	else if (k&knd.idxr) val = []
	else throw new Error("cannot make unresolved type "+ typ.toStr(t))
	return {typ:t, val, src}
}

