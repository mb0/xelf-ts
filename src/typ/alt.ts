import {knd} from '../knd'
import {Type, make, has, deopt, equal} from './typ'
import {assignableTo, convertibleTo} from './comp'
import {typ} from './pre'

function isSimple(t:Type) { return !t.id && !t.body }

export function altRestrict(a:Type, t:Type):Type {
	let sim = isSimple(t)
	if (sim && (a.kind&t.kind) == t.kind) return t
	if (a.body && 'alts' in a.body) {
		let alts = a.body.alts
		if (altsHas(alts, t)) return t
		if (!t.id) {
			let a = alts.find(a => assignableTo(a, t))
			if (a) return a
		}
	}
	if (sim) return typ.make(t.kind&a.kind)
	return typ.void
}

function altsHas(alts:Type[], t:Type):boolean {
	return !!alts.find(t.id ? a => t.id == a.id : a => assignableTo(t, a))
}

function addAlt(t:Type, res:Type, alts:Type[]):Type[] {
	if (!isSimple(t)) {
		res.kind |= knd.alt
		let tt = deopt(t)
		let ok = altsHas(alts, tt)
		if (!ok) {
			alts = alts.filter(a => !convertibleTo(a, tt))
			alts.push(tt)
		}
		res.kind |= t.kind&knd.none
	} else res.kind |= t.kind
	return alts
}
function addBody(t:Type, res:Type, alts:Type[]) {
	res.kind |= t.kind
	if (t.body && 'alts' in t.body) {
		t.body.alts.forEach(a => {
			if (!altsHas(alts, a)) alts.push(a)
		})
	}
}
export function common(a:Type, b:Type):Type {
	if (!b.kind) return b
	if (!a.kind || equal(a, b)) return a
	if (assignableTo(a, b)) return b
	if (assignableTo(b, a)) return a
	let alts:Type[] = []
	let res:Type = make(knd.void)
	if (has(a, knd.alt)) addBody(a, res, alts)
	else alts = addAlt(a, res, alts)
	if (has(b, knd.alt)) addBody(b, res, alts)
	else alts = addAlt(b, res, alts)
	if (alts.length) {
		if (alts.length == 1 && res.kind == knd.alt)
			return alts[0]
		res.body = {alts}
	}
	return res
}

export function choose(a:Type, stack?:Type[]):Type {
	if (!has(a, knd.alt)) {
		if (!a.body || !('params' in a.body)) return a
		if (stack) {
			let r = stack.find(t => equal(t, a))
			if (r) return r
		}
		let hist = (stack||[]).concat(a)
		return {kind:a.kind, ref:a.ref, id:a.id, body:{
			params: a.body.params.map(p => ({name: p.name, typ:choose(p.typ, hist)}))
		}}
	}
	if (a.body && 'alts' in a.body) {
		let alts = a.body.alts
		// TODO reduce alts to the most specific type that covers all alts
	}
	return a
}

