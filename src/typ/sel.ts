import {Path, PathSeg, parsePath} from '../pth'
import {knd} from '../knd'
import {Type} from './typ'
import {typ} from './pre'
import {choose} from './alt'

export function select(t:Type, path:string):Type|null {
	return selectPath(t, parsePath(path))
}

export function selectPath(t:Type, path:Path):Type|null {
	return path.reduce((a:Type|null, s:PathSeg):Type|null => {
		if (a && s.sel == '/') a = selIdx(a, 0)
		if (!a) return null
		let res = s.idx != undefined ? selIdx(a, s.idx) : selKey(a, s.key||'')
		if (!res || s.sel != '/') return res
		return typ.listOf(res)
	}, t)
}

function selKey(t:Type, key:string):Type|null {
	t = choose(t)
	if (t.body && 'params' in t.body) {
		let p = t.body.params.find(p => p.name == key)
		return p ? p.typ : null
	}
	if (typ.has(t, knd.keyr)) {
		return t.body && 'kind' in t.body ? t.body : typ.any
	}
	return null
}

function selIdx(t:Type, idx:number):Type|null {
	t = choose(t)
	if (t.body && 'params' in t.body) {
		let ps = t.body.params
		return (idx >= 0 && idx < ps.length) ? ps[idx].typ : null
	}
	if (typ.has(t, knd.idxr)) {
		return t.body && 'kind' in t.body ? t.body : typ.any
	}
	return null
}

