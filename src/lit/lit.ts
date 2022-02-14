import {knd} from '../knd'
import {quote} from '../cor'
import {Type, typ} from '../typ'

export type Val = null | boolean | number | string | Date | Type | List | Dict | Spec
export type List = Val[]
export type Dict = {[key:string]:Val}

interface Spec {
	name:string
	decl:Type
}

export const lit = {toStr, zero, make}

function toStr(v:Val, json?:boolean):string {
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
			r += toStr(e, json)
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
			r += ':'+ toStr(obj[k], json)
		})
		r += '}'
		return r
	}
	throw new Error("lit toString unknown literal "+ JSON.stringify(v))
}

function zero(v:Val):boolean {
	if (Array.isArray(v)) return !v.length
	return !v || v == typ.void
}

function make(t:Type):Val {
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
	return val
}

