import {knd} from '../knd'
import {Type, make, ParamBody, optParam} from './typ'

const kndVal = knd.any | knd.exp
export function assignableTo(t:Type, dst:Type):boolean {
	if (!knd.isAlt(t.kind) || (t.kind&knd.any) == knd.any) return assignTo(t, dst)
	return always(t, dst) || !alts(t).find(tt => !assignTo(tt, dst))
}
export function convertibleTo(t:Type, dst:Type):boolean {
	if (!knd.isAlt(t.kind) || (t.kind&knd.any) == knd.any) return convertTo(t, dst)
	return always(t, dst) || !!alts(t).find(tt => convertTo(tt, dst))
}
export function resolvableTo(t:Type, dst:Type):boolean {
	const tids:number[] = []
	const dids:number[] = []
	t = unwrapExp(t, tids)
	dst = unwrapExp(dst, dids)
	return idMatch(tids, dids) || convertibleTo(t, dst)
}
function assignTo(t:Type, dst:Type):boolean {
	if (always(t, dst)) return true
	const sk = t.kind&kndVal
	if (!sk) return false
	const db = dst.body
	if (!db) return (dst.kind&sk) == sk
	if ('kind' in db) {
		return (dst.kind&sk) == sk && assignableTo(elem(t), db)
	} else if ('alts' in db) {
		if ((dst.kind&sk) == sk) return true
		return !!alts(dst).find(da => assignableTo(t, da))
	} else if ('params' in db) {
		return !!t.body && 'params' in t.body && ((dst.kind&sk) == sk ||
			((sk&knd.spec) != 0 && (dst.kind&knd.spec) != 0) ||
			((sk&knd.obj) != 0 && (dst.kind&knd.obj) != 0)
		) && !db.params.find(dp => {
			const ps = (t.body as ParamBody).params
			const f = ps.find(tp => tp.name == dp.name)
			if (!f) return !optParam(dp)
			return !assignableTo(f.typ, dp.typ)
		})
	} else if ('consts' in db) {
		// we can assign constant names and values
		return sk == dst.kind && t.ref && t.ref == dst.ref || sk == knd.str || sk == knd.int
	}
	return false
}
function convertTo(t:Type, dst:Type):boolean {
	if (always(t, dst) || ((t.kind&knd.var) != 0 && (t.kind&kndVal) == 0)) return true
	const sk = t.kind&kndVal
	if (!sk) return false
	const db = dst.body
	if (!db) return (dst.kind&sk) != 0
	if ('kind' in db) {
		const k = sk&~knd.none
		return (dst.kind&k) != 0 && convertibleTo(elem(t), db)
	} else if ('alts' in db) {
		if ((dst.kind&sk)&~knd.none) return true
		return !!alts(dst).find(da => convertTo(t, da))
	} else if ('params' in db) {
		const k = sk&~knd.none
		return !!t.body && 'params' in t.body && ((dst.kind&k) == k ||
			((sk&knd.spec) != 0 && (dst.kind&knd.spec) != 0) ||
			((sk&knd.obj) != 0 && (dst.kind&knd.obj) != 0)
		) && !db.params.find(dp => {
			const ps = (t.body as ParamBody).params
			const f = ps.find(tp => tp.name == dp.name)
			if (!f) return !optParam(dp)
			return !convertibleTo(f.typ, dp.typ)
		})
	} else if ('consts' in db) {
		// we can assign constant names and values
		return sk == dst.kind && t.ref && t.ref == dst.ref || sk == knd.str || sk == knd.int
	}
	return false
}
function always(t:Type, dst:Type):boolean {
	return t.id > 0 && t.id == dst.id ||
		(dst.kind&knd.var) != 0 && (dst.kind&kndVal) == 0 ||
		(dst.kind&knd.any) == knd.none && (t.kind&knd.none) != 0
}
function unwrapExp(t:Type, ids:number[]):Type {
	while (t.kind&knd.exp) {
		if (t.id > 0) ids.push(t.id)
		t = elem(t)
	}
	return t
}
function idMatch(a:number[], b:number[]):boolean {
	if (a.length < b.length) {
		const t = a
		a = b
		b = t
	}
	return b.length > 0 && !!a.find(x => b.indexOf(x) >= 0)
}
function elem(t:Type):Type {
	if (t.body && 'kind' in t.body) return t.body
	const k = t.kind&knd.all
	if (k == knd.form || k == knd.func) {
		if (t.body && 'params' in t.body && t.body.params.length) {
			return t.body.params.at(-1)!.typ
		}
	}
	return make(knd.any)
}
export function alts(t:Type):Type[] {
	if (!knd.isAlt(t.kind)) return [t]
	let res:Type[] = []
	let k = t.kind&~(knd.none|knd.var)
	for (let i=knd.names.length-1; k && k != knd.alt && i > 0; i--) {
		let info = knd.names[i]
		if (info.kind && info.kind != knd.alt && (k&info.kind) == info.kind) {
			res.unshift(make(info.kind))
			k &= ~info.kind
		}
	}
	if (t.body && 'alts' in t.body) {
		res.push(...t.body.alts)
	}
	return res
}
