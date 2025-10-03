
import { create, all, MathNode, SymbolNode } from 'mathjs';

export const math = create(all);

// --- Simpson's Rule for Numerical Integration ---
function simpsonsRule(func: (x: number) => number, a: number, b: number, n: number = 200): number {
    if (n % 2 !== 0) n++; // Ensure n is even
    const h = (b - a) / n;
    let sum = func(a) + func(b);

    for (let i = 1; i < n; i += 2) {
        sum += 4 * func(a + i * h);
    }
    for (let i = 2; i < n - 1; i += 2) {
        sum += 2 * func(a + i * h);
    }

    return (h / 3) * sum;
}

// --- Function Generation ---
function generateRandomFunction(intervalLimit: number): MathNode {
    const baseFunctions = [
        'x', 'x^2', 'x^3', 'x^4',
        'sin(x)', 'cos(x)', 'exp(x)',
        'tanh(x)', 'sinh(x)',
        'atan(x)', '1 / (x^2 + 1)',
        'cbrt(x)', // Now safe
        `asin(x / ${intervalLimit})` // Also safe with scaling
    ];
    const scalars = [0.5, 1.5, 2, 3];

    const numToCombine = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    const chosenFuncs = [...baseFunctions].sort(() => 0.5 - Math.random()).slice(0, numToCombine);

    // Helper to create a modified (signed and scaled) function string
    const createModifiedString = (func: string) => {
        let modifiedFunc = func;
        // 33% chance to apply a scalar to avoid over-complicating
        if (Math.random() < 0.33) {
            const scalar = scalars[Math.floor(Math.random() * scalars.length)];
            modifiedFunc = `${scalar} * (${modifiedFunc})`;
        }
        // Apply a random sign
        if (Math.random() < 0.5) {
            return `-(${modifiedFunc})`;
        }
        return modifiedFunc;
    };

    if (numToCombine === 1) {
        return math.parse(createModifiedString(chosenFuncs[0]));
    }

    if (numToCombine === 2) {
        const f1String = `(${createModifiedString(chosenFuncs[0])})`;
        const f2String = `(${createModifiedString(chosenFuncs[1])})`;
        const op = ['+', '*', 'compose'][Math.floor(Math.random() * 3)];

        if (op === '+') {
            return math.parse(`${f1String} + ${f2String}`);
        }
        if (op === '*') {
            return math.parse(`${f1String} * ${f2String}`);
        }

        // compose
        const f1Node = math.parse(f1String);
        const f2Node = math.parse(f2String);

        if (Math.random() < 0.5) {
            // f1(f2(x))
            return f1Node.transform(function (node: MathNode) {
                if (math.isSymbolNode(node) && node.name === 'x') {
                    return f2Node;
                }
                return node;
            });
        } else {
            // f2(f1(x))
            return f2Node.transform(function (node: MathNode) {
                if (math.isSymbolNode(node) && node.name === 'x') {
                    return f1Node;
                }
                return node;
            });
        }
    }

    // numToCombine === 3
    const f1String = `(${createModifiedString(chosenFuncs[0])})`;
    const f2String = `(${createModifiedString(chosenFuncs[1])})`;
    const f3String = `(${createModifiedString(chosenFuncs[2])})`;

    // Combine first two with + or *
    const op1 = ['+', '*'][Math.floor(Math.random() * 2)];
    const intermediate = `(${f1String} ${op1} ${f2String})`;

    // Combine with the third using + or *
    const op2 = ['+', '*'][Math.floor(Math.random() * 2)];
    const finalFuncString = `(${intermediate}) ${op2} ${f3String}`;

    return math.parse(finalFuncString);
}

export function getNewFunctions(interval: [number, number]): { f1: MathNode, f2: MathNode } {
    const intervalLimit = Math.max(Math.abs(interval[0]), Math.abs(interval[1]));
    let f1 = generateRandomFunction(intervalLimit);
    let f2 = generateRandomFunction(intervalLimit);

    // Ensure functions are not identical or direct negatives
    while (f1.equals(f2) || f1.equals(math.parse(`-(${f2.toString()})`))) {
        f2 = generateRandomFunction(intervalLimit);
    }
    return { f1, f2 };
}

// --- Angle Calculation ---
export function calculateAngle(
    f1_orig: MathNode,
    f2_orig: MathNode,
    isUnitary: boolean,
    interval: [number, number],
    ensureAcute: boolean
): { angle: number | null, f1_final: MathNode, f2_final: MathNode } {
    let f1 = f1_orig;
    let f2 = f2_orig;

    try {
        // Unitary mode normalizes the functions f1 and f2, which is correct.
        if (isUnitary) {
            const f1Sq = math.parse(`(${f1.toString()})^2`);
            const f2Sq = math.parse(`(${f2.toString()})^2`);
            const normF1Sq = simpsonsRule(x => f1Sq.evaluate({ x }), interval[0], interval[1]);
            const normF2Sq = simpsonsRule(x => f2Sq.evaluate({ x }), interval[0], interval[1]);

            const normF1 = Math.sqrt(normF1Sq);
            const normF2 = Math.sqrt(normF2Sq);

            if (normF1 === 0 || normF2 === 0) return { angle: null, f1_final: f1, f2_final: f2 };

            f1 = math.parse(`(${f1.toString()}) / ${normF1}`);
            f2 = math.parse(`(${f2.toString()}) / ${normF2}`);
        }

        // --- CORRECTED LOGIC ---
        // The inner product is of the functions themselves.
        const innerProductIntegrand = math.parse(`(${f1.toString()}) * (${f2.toString()})`);
        let innerProduct = simpsonsRule(x => innerProductIntegrand.evaluate({ x }), interval[0], interval[1]);

        // Acute angle logic remains the same, but now operates on the correct inner product.
        if (ensureAcute && innerProduct < 0) {
            f2 = math.parse(`-(${f2.toString()})`); // Flip f2 for the display string
            innerProduct = -innerProduct;      // Flip the inner product for the angle calc
        }

        // The norms are of the functions themselves.
        const normF1SqIntegrand = math.parse(`(${f1.toString()})^2`);
        const normF2SqIntegrand = math.parse(`(${f2.toString()})^2`);

        const normF1 = Math.sqrt(simpsonsRule(x => normF1SqIntegrand.evaluate({ x }), interval[0], interval[1]));
        const normF2 = Math.sqrt(simpsonsRule(x => normF2SqIntegrand.evaluate({ x }), interval[0], interval[1]));

        if (normF1 === 0 || normF2 === 0) {
            return { angle: null, f1_final: f1, f2_final: f2 };
        }

        let cosTheta = innerProduct / (normF1 * normF2);
        cosTheta = Math.max(-1, Math.min(1, cosTheta));

        const angleRad = Math.acos(cosTheta);
        const angleDeg = angleRad * (180 / Math.PI);

        return { angle: angleDeg, f1_final: f1, f2_final: f2 };

    } catch (error) {
        console.error("Error calculating angle:", error);
        return { angle: null, f1_final: f1, f2_final: f2 };
    }
}
