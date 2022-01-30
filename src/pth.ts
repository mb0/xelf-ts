
export interface PathSeg {
	key:string
	idx:number
	sel:boolean
}

export type Path = PathSeg[]

export function parsePath(s:string):Path {
	let p:Path = []
	if (!s) return p
	let start = 0, i = 0
	let seg = ():PathSeg => {
		let raw = s.slice(start+1, i)
		let sel = s[start] == '/'
		if (raw.match(/^(0|-?[1-9][0-9]*)$/)) {
			return {key:'', idx:parseInt(raw), sel}
		}
		return {key:raw, idx:0, sel}
	}
	for (; i<s.length; i++) {
		let c = s[i]
		if (c == '.' || c == '/') {
			if (i > start) p.push(seg())
			start = i
		}
	}
	if (i > start) p.push(seg())
	return p
}
