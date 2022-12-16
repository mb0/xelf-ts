import {knd} from '../knd'
import {Type, Body, Param, make, has, deopt, equal, equalBody} from './typ'
import {alts} from './comp'
import {common} from './alt'

function makeRef(k:number, ref:string, body?:Body):Type {
	return {kind:k, id:0, ref:ref||undefined, body:body}
}

export const typ = {
	void: prim(knd.void),
	none: prim(knd.none),
	bool: prim(knd.bool),
	num:  prim(knd.num),
	int:  prim(knd.int),
	real: prim(knd.real),
	char: prim(knd.char),
	str:  prim(knd.str),
	raw:  prim(knd.raw),
	uuid: prim(knd.uuid),
	span: prim(knd.span),
	time: prim(knd.time),

	lit:  prim(knd.lit),
	typ:  prim(knd.typ),
	sym:  prim(knd.sym),
	tag:  prim(knd.tag),
	tupl: prim(knd.tupl),
	call: prim(knd.call),
	exp:  prim(knd.exp),

	idxr: prim(knd.idxr),
	keyr: prim(knd.keyr),
	list: prim(knd.list),
	dict: prim(knd.dict),

	data: prim(knd.data),
	spec: prim(knd.spec),
	all:  prim(knd.all),
	any:  prim(knd.any),

	opt: mark(knd.none),
	deopt, withRef,
	withID: (id:number, {kind,body,ref}:Type):Type => ({kind, id, ref, body}),
	var: (id:number, t?:Type):Type => {
		t = t||typ.void
		return make(t.kind|knd.var, t.body, id)
	},

	ref: (ref:string) => makeRef(knd.ref, ref),
	sel: (path:string, sel?:Type) => makeRef(knd.sel, path, sel),

	obj: (...ps:Param[]) => param(knd.obj, ps),

	typOf:  elem(knd.typ),
	litOf:  elem(knd.lit),
	symOf:  elem(knd.sym),
	expOf:  elem(knd.exp),
	listOf: elem(knd.list),
	dictOf: elem(knd.dict),
	tuplOf: (...ps:Param[]) => param(knd.tupl, ps),

	func: (...ps:Param[]) => param(knd.func, ps),
	form: (n:string, ...ps:Param[]) => withRef(n, param(knd.form, ps)),

	alt:  (...alts:Type[]) => alts.reduce(common),
	mask: (t:Type, m:number) => make(t.kind&~m, t.body, t.id),

	make, has, is, last, equal, toStr, alts, base,
}

function is(t:Type, k:number) { return (t.kind&k) == k }
function prim(k:number) { return Object.freeze(make(k)) }
function mark(k:number):(t:Type)=>Type {
	return (t:Type) => is(t, k) ? t : {kind:t.kind|k, body:t.body, id:t.id, ref:t.ref}
}
function elem(k:number):(t:Type)=>Type {
	return (el:Type) => make(k, el)
}
function param(k:number, params:Param[]):Type {
	return make(k, {params})
}
function withRef(ref:string, {kind,id,body}:Type):Type {
	return {kind, id, ref:ref||undefined, body}
}

function last(t:Type):Type {
	while (t && t.body) {
		if ('kind' in t.body) {
			t = t.body
		} else break
	}
	return t
}
function base(t:Type):Type {
	while (t.kind&knd.exp) {
		t = t.body && 'kind' in t.body ? t.body : typ.void
	}
	return t
}

function toStr(t:Type, paren?:boolean):string {
	const s = str('', t)
	return paren && s && s[0] != '<' ? '<' + s + '>': s
}
function str(b:string, t:Type, stack?:Body[]):string {
	if (!t.kind) return "<>"
	let isVar = false, isNone = false, isSel = false, isAlt = false
	let k = t.kind
	if (k&knd.ref) {
		k = k&~knd.ref
	} else if (isVar = (k&knd.var) != 0) {
		k = k&~knd.var
	} else if (isSel = (k&knd.sel) != 0 && !!t.ref) {
		k = k&~knd.sel
	}
	if (isNone = (k&knd.none) != 0 && t.kind != knd.none && k != knd.any) {
		k = k&~knd.none
	}
	let sb = ''
	if (t.body && stack && 'params' in t.body) {
		let idx = stack.findIndex(h => equalBody(h, t.body, []))
		if (idx != -1) {
			b += '.'.repeat(stack.length - idx)
			if (t.kind&knd.none) b += '?'
			return b
		}
	}
	if (isSel) {
		sb = t.ref!
		if (sb.slice(0,2) == ".0") sb = "_" + sb.slice(2)
	} else if (k) {
		sb = knd.name(k)
		if (isAlt = !sb || (k&knd.alt) != 0) {
			sb = "alt"
		}
	}
	if (isVar || t.ref && !isSel) {
		sb += '@'
		if (isVar && t.id > 0) sb += t.id
		if (t.ref) sb += t.ref
	}
	if (isNone) sb += '?'
	if (isAlt) {
		alts(t).forEach((a:Type) => {
			sb += ' '+ str('', a, stack)
		})
		return '<' + b + sb + '>'
	}
	if (t.body) {
		const tb = t.body
		if ('kind' in tb) {
			if (tb.kind) return str(b + sb + '|', tb, stack)
		} else if ('params' in tb) {
			let hist = (stack||[]).concat(tb)
			if (hist.length > 99) throw new Error("history")
			tb.params.forEach(p => sb += ' ' + (!p.name ? str('', p.typ, hist) :
				p.name + (p.typ ? ':'+ str('', p.typ, hist) : ';')
			))
			return '<' + b + sb + '>'
		} else if ('consts' in tb) {
			tb.consts.forEach(c => sb += ' ' + c.name + (!c.val ? ';' : ':'+ c.val))
			return '<' + b + sb + '>'
		}
	}
	return b + sb
}
