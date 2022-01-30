import {knd} from '../knd'
import {Type, Body, Param, make, has, deopt, equal, equalBody} from './typ'
import {alts} from './comp'
import {common} from './alt'

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
	any:  prim(knd.any),
	all:  prim(knd.all),

	opt: mark(knd.none),
	deopt,
	withID: (id:number, t:Type):Type => make(t.kind, t.body, id),
	var: (id:number, t?:Type):Type => {
		t = t||typ.void
		return make(t.kind|knd.var, t.body, id)
	},

	ref: (ref:string) => make(knd.ref, {ref}),
	sel: (path:string, sel?:Type) => make(knd.sel, {path, sel:sel||typ.void}),

	rec: (...ps:Param[]) => param(knd.rec, '', ps),
	obj: (n:string, ...ps:Param[]) => param(knd.obj, n, ps),

	typOf:  elem(knd.typ),
	litOf:  elem(knd.lit),
	symOf:  elem(knd.sym),
	expOf:  elem(knd.exp),
	listOf: elem(knd.list),
	dictOf: elem(knd.dict),
	tuplOf: (...ps:Param[]) => param(knd.tupl, '', ps),

	func: (...ps:Param[]) => param(knd.func, '', ps),
	form: (n:string, ...ps:Param[]) => param(knd.form, n, ps),

	alt:  (...alts:Type[]) => alts.reduce(common),
	mask: (t:Type, m:number) => make(t.kind&~m, t.body, t.id),

	make, has, is, last, equal, toStr, alts, base,
}

function is(t:Type, k:number) { return (t.kind&k) == k }
function prim(k:number) { return Object.freeze(make(k)) }
function mark(k:number):(t:Type)=>Type {
	return (t:Type) => is(t, k) ? t : make(t.kind|k, t.body, t.id)
}
function elem(k:number):(t:Type)=>Type {
	return (el:Type) => make(k, {el})
}
function param(k:number, name:string, params:Param[]):Type {
	return make(k, {name, params})
}

function last(t:Type):Type {
	while (t && t.body) {
		if ('el' in t.body) {
			t = t.body.el
		} else if ('sel' in t.body) {
			t = t.body.sel
		} else break
	}
	return t
}
function base(t:Type):Type {
	while (t.kind&knd.exp) {
		t = t.body && 'el' in t.body ? t.body.el : typ.void
	}
	return t
}

function toStr(t:Type, paren?:boolean):string {
	const s = str('', t)
	return paren && s && s[0] != '<' ? '<' + s + '>': s
}
function str(b:string, t:Type, stack?:Body[]):string {
	switch (t.kind) {
	case knd.void:
		return b + "<>"
	case knd.none:
		return b + "none"
	case knd.any:
		return b + "any"
	case knd.all:
		return b + "?"
	case knd.ref:
		b += "@"
		if (t.body && 'ref' in t.body) b += t.body.ref
		return b
	case knd.sel:
	case knd.sel|knd.none:
		if (!t.body || !('path' in t.body)) throw new Error("sel type without body")
		let {path, sel} = t.body
		b += path
		if (t.kind&knd.none) b += '?'
		return sel.kind ? str(b+'|', sel, stack) : b
	case knd.var:
		b += "@"
		if (t.id>0) b += t.id
		return b
	}
	if (t.body && stack) {
		let idx = stack.findIndex(h => equalBody(h, t.body, []))
		if (idx != -1) {
			b += '............'.slice(0, stack.length - idx)
			if (t.kind&knd.none) b += '?'
			return b
		}
	}
	let k = t.kind&~(knd.var|knd.alt|knd.none)
	let n = k ? knd.name(k) : ''
	if ((t.body && 'alts' in t.body||!n) && knd.isAlt(t.kind)) {
		b = defSuffix(b, 'alt', t)
		alts(t).forEach((a:Type) => {
			b += ' '+ str('', a, stack)
		})
		return '<'+ b +'>'
	}
	if (t.body) {
		let tb = t.body
		if ('el' in tb) {
			b = defSuffix(b, n, t)
			if (tb.el == typ.void) return b
			return str(b+'|', tb.el, stack)
		}
		b = defSuffix(b, n, t)
		if ('name' in tb && tb.name) b += ' '+ tb.name
		if ('params' in tb) {
			let hist = (stack||[]).concat(tb)
			if (hist.length > 99) throw new Error("history")
			tb.params.forEach(p => b += ' ' + (!p.name ? str('', p.typ, hist) :
				p.name + (p.typ ? ':'+ str('', p.typ, hist) : ';')
			))
		}
		return '<'+ b +'>'
	}
	b = defSuffix(b, n, t)
	return b
}

function defSuffix(b:string, n:string, t:Type):string {
	if (n) b += n
	if (t.id) b += '@'
	if (t.id>0) b += t.id
	if (has(t, knd.none)) b += '?'
	return b
}

