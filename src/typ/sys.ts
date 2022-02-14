import {knd} from '../knd'
import {typ} from './pre'
import {Type, Param, equalBody} from './typ'
import {altRestrict} from './alt'
import {select} from './sel'

interface Reg {
	refType(ref:string):Type|null
}

export class Sys {
	maxid = 0
	map = new Map<number,Type>()
	reg?:Reg
	tmp = false
	constructor(reg?:Reg) {
		this.reg = reg
	}
	// IDs are used for type variables, schema types and usually undetermined types, that
	// correspond to a source position. Bound types may change in-place but the type
	// identity stays the same. Once bound even the id may change returning the changed
	// type for lookups with its original id. Schema types are registered on context setup and
	// should be frozen. Undetermined program types usually start as a variable with a new id.
	// that type info is then gradually refined.
	bind(t:Type):Type {
		if (t.id<=0) t = typ.make(t.kind, t.body, ++this.maxid)
		this.map.set(t.id, t)
		return t
	}
	get(id:number):Type {
		return id && this.map.get(id) || typ.void
	}
	ref(ref:string):Type|null {
		return this.reg ? this.reg.refType(ref) : null
	}
	apply(r:Type):Type {
		return clone(r, [], (t:Type, _:Stack):Type => t.kind&knd.var ? this.get(t.id) : t)
	}
	inst(r:Type):Type {
		let m = new Map()
		return clone(r, [], inst(this, m))
	}
	unify(t:Type, h:Type):Type {
		let a = this.apply(t)
		let b = this.apply(h)
		let r = unify(this, a, b)
		return update(this, t, h, r)
	}
}

function update(ctx:Sys, t:Type, h:Type, r:Type):Type {
	r.id = r.id || t.id || h.id
	if (r.id) ctx.map.set(r.id, r)
	if (t.kind&knd.var) ctx.map.set(t.id, r)
	if (h.kind&knd.var) ctx.map.set(h.id, r)
	return r
}

// unify combines the type information of two types into a new type and binds type vars.
// whenever a type var is encountered it will be unified with the corresponding type
// if both are type vars the first will point to the second and their constraints are unified
// incompatible types do not create an alternative but instead throw an exception.
function unify(ctx:Sys, t:Type, h:Type):Type {
	// update both types from context
	// if a or hint is void return a
	let a = typ.base(t), b = typ.base(h)
	let kk = a.kind|b.kind
	if (kk&knd.sel || kk&knd.ref)
		throw new Error("cannot unify "+ typ.toStr(t) +" with "+ typ.toStr(h))
	let done = (r:Type) => update(ctx, t, h, r)
	let ak = a.kind&~(knd.var|knd.none)
	let bk = b.kind&~(knd.var|knd.none)
	if (!ak) {
		if (!a.id) return b
		let c = typ.make(b.kind, b.body, a.id)
		if (!bk||knd.isAlt(b.kind)) c.kind |= knd.var
		return done(c)
	}
	if (!bk) return done(a)
	if (kk&knd.alt) {// unifiy alt
		let aa = (ak&knd.alt) != 0
		let x = aa ? a : b
		let y = aa ? b : a
		let alts = typ.alts(y)
		alts = alts.map(e => altRestrict(x,e)).filter(e => e.kind != 0)
		if (!alts.length) {
			throw new Error("cannot unify "+ typ.toStr(t) +" with "+ typ.toStr(h))
		}
		let r = typ.alt(...alts)
		return done(r)
	}
	// if equal kind and body
	if (ak == bk) {
		if (equalBody(a.body, b.body)) {
			return done(a)
		}
		if (a.body && 'el' in a.body) {
			let c = a
			if (b.body && 'el' in b.body) { 
				let el = unify(ctx, a.body.el, b.body.el)
				c = typ.make(a.kind, {el}, a.id)
			}
			return done(c)
		}
	} else {
		let k = a.kind&knd.all
		k = !k ? b.kind&knd.all : k&b.kind
		if (k && equalBody(a.body, b.body)) {
			return done(typ.make(k, a.body, a.id))
		} else {

		}
	}
	throw new Error("cannot unify "+ typ.toStr(t) +" with "+ typ.toStr(h))
}

type Stack = [Type, Type][]
type Editor = (t:Type, s:Stack)=>Type

function clone(r:Type, stack:Stack, edit?:Editor):Type {
	let s = stack.find(s => s[0] == r)
	if (s) return s[1]
	let t = typ.make(r.kind, r.body, r.id)
	let b = t.body
	if (!b) {
	} else if ('alts' in b) {
		t.body = {alts:b.alts.map(a => clone(a, stack, edit))}
	} else if ('el' in b) {
		t.body = {el:clone(b.el, stack, edit)}
	} else if ('sel' in b && b.sel) {
		t.body = {path:b.path, sel:clone(b.sel, stack, edit)}
	} else if ('params' in b) {
		let ps:Param[] = []
		t.body = {name:b.name, params:ps}
		stack = stack.concat([[r, t]])
		b.params.forEach(p => {
			let pt = clone(p.typ, stack, edit)
			ps.push({name:p.name, typ:pt})
		})
	}
	if (edit) t = edit(t, stack)
	return t
}

function inst(c:Sys, m:Map<number,Type>):Editor {
	let edit = (t:Type, s:Stack):Type => {
		let id = t.id
		if (id>0) {
			let mt = m.get(id)
			if (mt) return mt
			m.set(id, t)
		}
		if (id) {
			t.id = ++c.maxid
			c.map.set(t.id, t)
		}
		let b = t.body
		if (!b) return t
		if ('ref' in b) {
			let x = c.ref(b.ref)
			if (!x) throw new Error("no type for ref "+ b.ref)
			return t.kind&knd.none ? typ.opt(x) : typ.deopt(x)
		}
		if ('path' in b) {
			let p = b.path
			let dots = 0
			while (p.length > 0 && p[0] == '.') {
				p = p.slice(1)
				dots++
			}
			let sel = b.sel
			if (sel.kind) {
				if (dots>1) throw new Error("non-local sel cannot use dots in "+
					typ.toStr(sel))
				sel = clone(sel, s, edit)
				// select if sel is resolved
			} else {
				if (!dots) throw new Error("local select type can only use dot")
				if (s.length < dots)
					throw new Error("invalid local select type "+ dots + " in "+
						s.reduce((a, s) => a + typ.toStr(s[0])+" ", ""))
				sel = s[s.length-dots][1]
				if (!sel)
					throw new Error("no sel for " + b.path + " in " +
						 s.reduce((a, s) => a + typ.toStr(s[0])+" ", ""))
			}
			if (p) {
				let f = select(sel, p)
				if (!f) throw new Error("sel type not found: "+ p +" on "+
					typ.toStr(sel))
				if (!f.id) {
					f.id = ++c.maxid
					c.map.set(f.id, f)
				}
				sel = f
			}
			return t.kind&knd.none ? typ.opt(sel) : typ.deopt(sel)
		}
		return t
	}
	return edit
}
