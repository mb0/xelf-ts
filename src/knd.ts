
export const knd = {
	void: 0,
	
	none: 1,   // 1<<0  0x01
	some: 2,   // 1<<1  0x02

	lit:  4,   // 1<<2  0x04
	typ:  8,   // 1<<3  0x08
	sym:  16,  // 1<<4  0x10
	tag:  32,  // 1<<5  0x20
	tupl: 64,  // 1<<6  0x40
	call: 128, // 1<<7  0x80

	bool: 1<<8,   // 0x0000100

	int:  1<<9,   // 0x0000200
	real: 1<<10,  // 0x0000400
	bits: 1<<11,  // 0x0000800

	str:  1<<12,  // 0x0001000
	raw:  1<<13,  // 0x0002000
	uuid: 1<<14,  // 0x0004000
	span: 1<<15,  // 0x0008000
	time: 1<<16,  // 0x0010000
	enum: 1<<17,  // 0x0020000

	list: 1<<18,  // 0x0040000
	dict: 1<<19,  // 0x0080000
	obj:  1<<20,  // 0x0100000

	func: 1<<21,  // 0x0200000
	form: 1<<22,  // 0x0400000

	alt:  1<<23,  // 0x0800000
	var:  1<<24,  // 0x1000000
	ref:  1<<25,  // 0x2000000
	sel:  1<<26,  // 0x4000000

	exp:  0x00000f4, // lit|sym|tag|tupl|call
	meta: 0x7800000, // alt|var|ref|sel

	num:  0x0000e00, // int|real|bits
	char: 0x003f000, // str|raw|uuid|span|time|enum
	prim: 0x003ff00, // bool|num|char
	cont: 0x00c0000, // list|dict
	idxr: 0x0140000, // list|obj
	keyr: 0x0180000, // dict|obj
	data: 0x01fff00, // prim|cont|obj
	spec: 0x0600000, // func|form
	all:  0x07fff08, // data|typ|spec
	any:  0x07fff09, // all|none

	names: [] as KindInfo[],
	name, isAlt, count,
}
const kmap = knd as {[name:string]:any}

export function parseKindName(str:string):number {
	if (!str) return -1
	let k = kmap[str]
	if (typeof k != "number") return 0
	return k
}
export interface KindInfo {
	name:string
	kind:number
}
Object.keys(kmap).reduce((a, k) => {
	let v = kmap[k]
	if (typeof v == "number") a.push({name:k, kind:v})
	return a
}, knd.names)

function name(k:number):string {
	if (k < 0) return 'err'
	let e = knd.names.find(e => e.kind == k)
	return e ? e.name : ''
}

function isAlt(k:number):boolean {
	return (k&knd.alt) != 0 || count(k&knd.any) > 1
}
function count(x:number):number {
	x = x - ((x >>> 1) & 0x55555555)
	x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
	x = (x + (x >>> 4)) & 0x0f0f0f0f;
	x = x + (x >>> 8);
	x = x + (x >>> 16);
	return x & 0x0000003F;
}
