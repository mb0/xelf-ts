import {knd} from '../knd'
import {unquote} from '../cor'
import {Ast, Tok, ast, errs, scan} from '../ast'
import {Type, typ, parseType} from '../typ'
import {Dict, Val} from './lit'

export function parseSym(a:Tok):Val|undefined {
	switch (a.raw) {
	case 'null':
		return null
	case 'false':
		return false
	case 'true':
		return true
	}
	return undefined
}

export function parse(a:Ast):Val {
	if (!ast.isSeq(a)) {
		switch (a.kind) {
		case knd.int:
		case knd.real:
			const n = parseFloat(a.raw)
			if (isNaN(n)) throw errs.invalid(a, a.kind)
			return n
		case knd.str:
			return unquote(a.raw)
		case knd.sym:
			const l = parseSym(a)
			if (l !== undefined) return l
		}
	} else {
		let t = a[0] as Tok
		let n = a.slice(1, -1)
		if (t.kind&knd.list) {
			return n.map(e => parse(e))
		} else if (t.kind&knd.keyr) {
			let dict = n.reduce((d:Dict, e) => {
				if (!ast.isTag(e, true)) throw errs.expectTag(e)
				d[ast.tag(e[1])] = parse(e[2])
				return d
			}, {})
			return dict
		}
	}
	throw errs.unexpected(a)
}

export function parseAs(a:Ast, t:Type) {
	return typedAs(parse(a), t)
}

export function typedAs(v:Val, t:Type):Val {
	if (v === null || v === undefined) return null
	switch (typeof v) {
	case "boolean":
		if (t.kind&knd.bool) return v
		break
	case "number":
		// int, real, bits
		if (t.kind&knd.num) return v
		// span, time
		break
	case "string":
		if (t.kind&(knd.sym|knd.str)) return v
		if (t.kind&knd.time) {
			return new Date(v)
		}
		if (t.kind&knd.uuid) {
			return parseUUID(v)
		}
		if (t.kind&knd.typ) {
			return parseType(scan(v))
		}
		if (t.kind&knd.raw) {
			// parse raw ?
			return v
		}
		if (t.kind&knd.span) {
			// TODO parse span
		}
		if (t.kind&knd.enum) {
			// TODO parse enum
		}
		break
	case "object":
		if (Array.isArray(v)) {
			if (!(t.kind&knd.list)) break
			if (t.body && 'el' in t.body) {
				const {el} = t.body
				for (let i=0; i<v.length; i++) {
					v[i] = typedAs(v[i], el)
				}
			}
			return v
		}
		if (v instanceof Date) {
			if (!(t.kind&knd.time)) break
			return v
		}
		let w = v as Dict
		if (t.kind&knd.dict) {
			if (t.body && 'el' in t.body) {
				const {el} = t.body
				Object.keys(w).forEach(key => {
					w[key] = typedAs(w[key], el)
				})
			}
			return w
		}
		if (t.kind&knd.strc) {
			// TODO make sure we have hydrated obj types?
			if (t.body && 'params' in t.body) {
				t.body.params.forEach(p => {
					if (!p.name) return // TODO handle embedded
					w[p.name] = typedAs(w[p.name], p.typ)
				})
			}
			return w
		}
		break
	}
	throw new Error("got "+v+" for "+typ.toStr(t))

}

export function parseUUID(s:string):string {
	if (/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s)) return s
	s = s.replace(/[- ]/, '').toLowerCase()
	if (!/^[a-f0-9]{32}$/.test(s)) throw new Error("invalid uuid "+s)
	return [s.slice(0, 8), s.slice(8, 12), s.slice(12, 16), s.slice(16, 20), s.slice(20)].join('-')
}
