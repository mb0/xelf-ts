
export interface PathSeg {
	sel:string
	key?:string
	idx?:number
}

export type Path = PathSeg[]

export function parsePath(s:string):Path {
	const p:Path = []
	while (s.length > 0) s = addSeg(p, s)
	return p
}

export function pathString(p:Path):string {
	let res = ""
	p.forEach(s => {
		res += s.sel
		if (s.idx) res += s.idx
		if (s.key) res += s.key
	})
	return res
}

export function fillVars(p:Path, vars:string[]) {
	let vi = 0
	p.forEach((s, i) => {
		if (s.key != "$" || !i && !s.sel) return
		if (vi >= vars.length) throw new Error("not enough path variables")
		s.key = vars[vi++]
		if (idxRe.test(s.key)) {
			s.idx = parseInt(s.key, 10)
			s.key = undefined
		}
	})
	if (vi < vars.length) throw new Error("superflous path segment variables "+vars.join(", "))
}

const sepRe = /[.\/]/
const idxRe = /^-?(0|[1-9]\d{0:9})$/
function addSeg(p:Path, s:string):string {
	const seg:PathSeg = {sel:''}
	if (sepRe.test(s[0])) {
		seg.sel = s[0]
		s = s.slice(1)
	} else if (p.length) {
		throw new Error("missing path sep")
	}
	const idx = s.search(sepRe)
	let rest = ""
	if (idx >= 0) {
		rest = s.slice(idx)
		s = s.slice(0, idx)
	}
	if (idxRe.test(s)) {
		seg.idx = parseInt(s, 10)
	} else {
		seg.key = s.toLowerCase()
	}
	p.push(seg)
	return rest
}

