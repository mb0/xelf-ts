import {knd} from '../knd'
import {typ} from './pre'
import {Type, equal, equalBody, make} from './typ'

export const cmp = {
	none:    0,
	check:   1,
	contort: 2,
	convert: 3,
	opt:     4,
	assign:  5,
	sameid:  6,
	same:    7,
}

const anytyp = make(knd.all,undefined, 0)
const unreskinds = knd.var|knd.ref|knd.sel

const elkinds = knd.typ|knd.exp|knd.cont

// TODO reconsider special conversion rules should be explicit and done using the conv form
export function compare(src:Type, dst:Type):number {
	// 1. return same if src and dst type are strictly equal
	if (equal(src, dst)) return cmp.same
	// 2. return none if src or dst has a void or error kind
	if (src.kind <= 0 || dst.kind <= 0) return cmp.none
	// 3. return sameid if src and dst have the same type id
	if (src.id && src.id == dst.id) return cmp.sameid
	// unwrap src expr type if dst is not an expr type
	if (src.kind&knd.exp && !(dst.kind&knd.exp)) {
		src = src.body && 'kind' in src.body ? src.body : anytyp
	}
	// Handle meta types
	// 4. return check if src or dst is unresolved (type variable, reference or selection)
	if (src.kind&unreskinds && !(src.kind&knd.any)||
		dst.kind&unreskinds && !(dst.kind&knd.any)) {
		return cmp.check
	}
	// 5. if src is a flagged alt type return assign if all alts in src can assign to dst,
	// convert if all alts can convert, check if at least on can convert and none if there is no
	// overlap in alternatives between src and dst.
	if (src.kind&knd.alt) {
		let als = alts(src)
		let asgn = 0, conv = 0
		als.forEach(a => {
			let c = compare(a, dst)
			if (c >= cmp.assign) asgn++
			else if (c >= cmp.convert) conv++
		})
		if (asgn == als.length) return cmp.assign
		if (asgn+conv == als.length) return cmp.convert
		if (asgn||conv) return cmp.check
		return cmp.none
	}
	// 6. if only dst is an alt type find an alternative that src can convert to
	if (dst.kind&knd.alt) {
		let res = cmp.none
		alts(dst).find(a => {
			res = compare(src, a)
			return res >= cmp.convert
		})
		if (res > cmp.assign) res = cmp.assign
		return res
	}
	let s = src.kind, d = dst.kind
	let sb = src.body, db = dst.body
	if (!sb != !db) {
		if (!sb && (s&elkinds) != 0) sb = typ.any
		else if (!db && (d&elkinds) != 0) db = typ.any
		if (s == d && equalBody(sb, db)) return cmp.same
	}
	// 7. if dst has no body compare just the kinds
	if (!db) {
		if ((d&s) == s) return cmp.assign
		if ((d|knd.none) == s) return cmp.opt
		if (!(s&d&knd.data))
			return cmp.none
		if ((s&knd.all) == knd.char && d&knd.str)
			return cmp.convert
		if ((s&knd.all) == knd.num && d&knd.num)
			return cmp.convert
		return cmp.check
	}
	if ('kind' in db) {
		if (!(s&d&(knd.data|knd.exp))) return cmp.none
		let sel = anyEl(src)
		let res = compare(sel, db)
		if (res >= cmp.assign) {
			if ((d|knd.none) == s) return cmp.opt
			return cmp.assign
		}
		if (res >= cmp.convert) return cmp.convert
		return res
	}
	if (sb && 'params' in db && 'params' in sb) {
		if (!(s&d&knd.all)) {
			return cmp.none
		}
		let dps = db.params
		let sps = sb.params
		let e = dps.find((dp, i) => {
			let sp:any = null
			if (dp.name)  {
				sp = sps.find(sp => sp.name == dp.name)
			} else if (sps.length > i) {
				sp = sps[i]
			}
			if (!sp) return true
			let c = compare(sp.typ, dp.typ)
			return c <= cmp.assign
		})
		if (!e) return cmp.assign
	}
	return cmp.none
}
function anyEl(t:Type):Type {
	return t.body && 'kind' in t.body ? t.body : make(knd.any|knd.none)
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

