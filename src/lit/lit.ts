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

export const litStr = (v:Val, json?:boolean):string => {
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
			r += litStr(e, json)
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
			r += ':'+ litStr(obj[k], json)
		})
		r += '}'
		return r
	}
	throw new Error("lit toString unknown literal "+ JSON.stringify(v))
}

export const zero = (v:Val):boolean => Array.isArray(v) ? !v.length : (!v || v == typ.void)

export const make = (t:Type):Val => {
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

export function equal(a:Val, b:Val):boolean {
	if (a == b) return true
	if (a == null) return b == null
	if (a instanceof Date) return b instanceof Date && a.getTime() == b.getTime()
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length != b.length) return false
		if (a.find((el, i) => !equal(el, b[i]))) return false
		return true
	}
	if (typeof a == "object") {
		if (b == null || typeof b != "object") return false
		let keys = Object.keys(a)
		if (!equal(keys, Object.keys(b))) return false
		if (keys.find(k => !equal((a as Dict)[k], (b as Dict)[k]))) return false
		return true
	}
	return false
}
