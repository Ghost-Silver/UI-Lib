import { Fn, fwidth, length, max, min, smoothstep, texture, vec2 } from "three/tsl";
import type { Node, Texture } from "three/webgpu";

export const evaluateMSDF = Fn(
	([msdfTexture, textureUV, pxRange]: [Texture, Node<"vec2">, Node<"float">]) => {
		const sample = texture(msdfTexture, textureUV);

		const sigDist = max(min(sample.r, sample.g), min(max(sample.r, sample.g), sample.b)).sub(
			0.5,
		);
		const afwidth = length(vec2(fwidth(textureUV.x), fwidth(textureUV.y))).mul(pxRange);

		const opacity = smoothstep(afwidth.negate(), afwidth, sigDist);
		return opacity;
	},
);
