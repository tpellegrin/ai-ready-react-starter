// @ts-check
/**
 * Region-level comparison of a render with a reference, from measured
 * boxes only (no pixels): which regions were found, whether siblings keep
 * the reference's arrangement (above/below, left/right), whether children
 * stay inside their parent, and how sizes compare as shares of the frame
 * width. Arrangement and presence are pass/fail; sizes are reported as
 * measurements, never turned into a similarity score.
 *
 * Reference boxes are the plan's approximate `bounds` (image pixels);
 * render boxes are CSS pixels from the browser. Each is compared within its
 * own frame, so a sketch's scale does not matter. Render boxes are what a
 * person sees (e2e/design/capture.spec.ts measures the painted box, or the
 * content's extent), comparable to bounds read off an image.
 */

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Box
 * @typedef {{ width: number, height: number }} Frame
 * @typedef {{
 *   id: string, label: string, parent?: string | undefined,
 *   reference: Box | null,
 *   measured: { found: boolean, visible: boolean, count: number, box: Box | null } | null,
 *   deviation: boolean,
 * }} RegionInput
 * @typedef {'above' | 'below' | 'left' | 'right'} Side
 * @typedef {{
 *   id: string, label: string, status: 'found' | 'missing' | 'hidden' | 'not-measured',
 *   size: { reference: Shares, render: Shares } | null,
 *   sizeDiffers: boolean,
 * }} RegionFinding
 * @typedef {{ left: number, width: number, height: number }} Shares
 * @typedef {{
 *   a: string, b: string, reference: Side[], render: Side[],
 *   status: 'match' | 'mismatch' | 'deviation',
 * }} RelationFinding
 * @typedef {{ child: string, parent: string, status: 'inside' | 'outside' }} ContainmentFinding
 * @typedef {{
 *   regions: RegionFinding[], relations: RelationFinding[],
 *   containment: ContainmentFinding[], failures: string[],
 * }} Geometry
 */

/** Edges closer than this share of the frame width count as touching. */
const TOLERANCE = 0.02;
/** Size differences above this share of the frame width are pointed out. */
export const SIZE_NOTE_THRESHOLD = 0.08;

/**
 * Where `a` is relative to `b`: above or below when one ends before the
 * other starts; otherwise (they share a row) left or right. Boxes on
 * different rows are not compared sideways: a header link and a footnote
 * are in reading order, not in a left/right relation.
 * @param {Box} a @param {Box} b @param {number} tolerance @returns {Side[]}
 */
export const sides = (a, b, tolerance) => {
  if (a.y + a.height <= b.y + tolerance) return ['above'];
  if (b.y + b.height <= a.y + tolerance) return ['below'];
  if (a.x + a.width <= b.x + tolerance) return ['left'];
  if (b.x + b.width <= a.x + tolerance) return ['right'];
  return [];
};

const SIDE_WORDS = {
  above: 'above',
  below: 'below',
  left: 'left of',
  right: 'right of',
};
/** "above", "left of", or "overlapping" for no clear side. */
export const describeSides = (/** @type {Side[]} */ list) =>
  list.map((side) => SIDE_WORDS[side]).join(' and ') || 'overlapping';

/** @param {Box} box @param {Frame} frame @returns {Shares} */
const shares = (box, frame) => ({
  left: box.x / frame.width,
  width: box.width / frame.width,
  // Height as a share of the frame *width*: page lengths differ, widths don't.
  height: box.height / frame.width,
});

/**
 * A child is inside its parent when at least half of its area is (a badge
 * may overlap the border it sits on).
 * @param {Box} inner @param {Box} outer
 */
const inside = (inner, outer) => {
  const width =
    Math.min(inner.x + inner.width, outer.x + outer.width) -
    Math.max(inner.x, outer.x);
  const height =
    Math.min(inner.y + inner.height, outer.y + outer.height) -
    Math.max(inner.y, outer.y);
  const area = inner.width * inner.height;
  return width > 0 && height > 0 && area > 0 && (width * height) / area >= 0.5;
};

/**
 * @param {{ regions: RegionInput[], referenceFrame: Frame | null, renderFrame: Frame }} input
 * @returns {Geometry}
 */
export const compareGeometry = ({ regions, referenceFrame, renderFrame }) => {
  /** @type {string[]} */
  const failures = [];
  const findings = regions.map((region) => {
    const measured = region.measured;
    /** @type {RegionFinding['status']} */
    const status = !measured
      ? 'not-measured'
      : !measured.found
        ? 'missing'
        : !measured.visible
          ? 'hidden'
          : 'found';
    if (status === 'missing' || status === 'hidden') {
      failures.push(
        `region "${region.id}" (${region.label}) is ${status} in the render`,
      );
    }
    const size =
      status === 'found' && measured?.box && region.reference && referenceFrame
        ? {
            reference: shares(region.reference, referenceFrame),
            render: shares(measured.box, renderFrame),
          }
        : null;
    const sizeDiffers =
      !!size &&
      ['left', 'width', 'height'].some(
        (key) =>
          Math.abs(
            size.reference[/** @type {keyof Shares} */ (key)] -
              size.render[/** @type {keyof Shares} */ (key)],
          ) > SIZE_NOTE_THRESHOLD,
      );
    return { id: region.id, label: region.label, status, size, sizeDiffers };
  });

  const comparable = regions.filter(
    (region) =>
      region.reference &&
      region.measured?.found &&
      region.measured.visible &&
      region.measured.box,
  );
  /** @type {RelationFinding[]} */
  const relations = [];
  if (referenceFrame) {
    const refTolerance = TOLERANCE * referenceFrame.width;
    const renderTolerance = TOLERANCE * renderFrame.width;
    for (const [index, a] of comparable.entries()) {
      for (const b of comparable.slice(index + 1)) {
        if ((a.parent ?? null) !== (b.parent ?? null)) continue;
        const reference = sides(
          /** @type {Box} */ (a.reference),
          /** @type {Box} */ (b.reference),
          refTolerance,
        );
        const render = sides(
          /** @type {Box} */ (a.measured?.box),
          /** @type {Box} */ (b.measured?.box),
          renderTolerance,
        );
        const same =
          reference.length === render.length &&
          reference.every((side) => render.includes(side));
        const status = same
          ? 'match'
          : a.deviation || b.deviation
            ? 'deviation'
            : 'mismatch';
        if (status === 'mismatch') {
          failures.push(
            `"${a.id}" is ${describeSides(reference)} "${b.id}" in the reference but ${describeSides(render)} it in the render`,
          );
        }
        relations.push({ a: a.id, b: b.id, reference, render, status });
      }
    }
  }

  /** @type {ContainmentFinding[]} */
  const containment = [];
  const byId = new Map(regions.map((region) => [region.id, region]));
  for (const region of regions) {
    const parent = region.parent ? byId.get(region.parent) : undefined;
    const box = region.measured?.box;
    const parentBox = parent?.measured?.box;
    if (!parent || !box || !parentBox) continue;
    const ok = inside(box, parentBox);
    // Outside in the reference too: that is the design, not a defect.
    const expected =
      region.reference && parent.reference
        ? inside(region.reference, parent.reference)
        : true;
    containment.push({
      child: region.id,
      parent: parent.id,
      status: ok ? 'inside' : 'outside',
    });
    if (!ok && expected) {
      failures.push(
        `region "${region.id}" is not inside its parent "${parent.id}" in the render`,
      );
    }
  }

  return { regions: findings, relations, containment, failures };
};
