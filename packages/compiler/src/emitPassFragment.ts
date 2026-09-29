import { FRAG_HEADER } from './glslPrelude.js';

/** Assemble full fragment shader: shared prelude, user uniforms, scene fn block, indented main body. */
export function emitPassFragment(
	uniformBlock: string,
	sceneFnBlock: string,
	mainBodyIndented: string,
): string {
	return `${FRAG_HEADER}\n${uniformBlock}\n\n${sceneFnBlock}void main() {\n${mainBodyIndented}\n}\n`;
}
