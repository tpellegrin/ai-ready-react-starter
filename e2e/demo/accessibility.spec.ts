import {
  expect,
  expectNoA11yViolations,
  gotoApp,
  seedDemoSession,
  test,
} from '../fixtures';

test.describe('guest pages', () => {
  for (const [path, heading] of [
    ['/', 'Starter overview'],
    ['/sign-in', 'Sign in'],
    ['/welcome', null],
    ['/does-not-exist', 'Page not found'],
  ] as const) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await gotoApp(page, path);
      if (heading) {
        await expect(
          page.getByRole('heading', { level: 1, name: heading }),
        ).toBeVisible();
      } else {
        await expect(page.getByRole('main')).toBeVisible();
      }
      await expectNoA11yViolations(page);
    });
  }
});

test.describe('signed-in pages', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  test('dashboard has no axe violations', async ({ page }) => {
    await gotoApp(page, '/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  // starter:reference-start
  test('resources (list and open dialog) have no axe violations', async ({
    page,
  }) => {
    await gotoApp(page, '/resources');
    await expect(page.getByRole('list', { name: 'Resources' })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'New resource' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoA11yViolations(page);
  });
  // starter:reference-end
});

test('onboarding has no axe violations', async ({ page }) => {
  await seedDemoSession(page, {
    email: 'fresh@example.com',
    needsOnboarding: true,
  });
  await gotoApp(page, '/');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expectNoA11yViolations(page);
});

// starter:reference-start
/**
 * Longest movement on the page (seconds): transitions of motion properties
 * (transform, position, size, opacity) and keyframe animations. Color and
 * shadow fades are not motion and are ignored.
 */
const longestMotion = () => {
  const MOTION =
    /^(all|transform|translate|scale|rotate|opacity|top|left|right|bottom|inset|margin.*|width|height)$/;
  const list = (value: string) => value.split(',').map((part) => part.trim());
  const seconds = (value: string) => parseFloat(value) || 0;
  return Math.max(
    0,
    ...Array.from(document.querySelectorAll('*')).map((element) => {
      const style = getComputedStyle(element);
      const properties = list(style.transitionProperty);
      const durations = list(style.transitionDuration);
      const delays = list(style.transitionDelay);
      const transition = Math.max(
        0,
        ...properties.map((property, index) =>
          MOTION.test(property)
            ? seconds(durations[index % durations.length] ?? '0') +
              seconds(delays[index % delays.length] ?? '0')
            : 0,
        ),
      );
      const animation =
        style.animationName === 'none'
          ? 0
          : Math.max(...list(style.animationDuration).map(seconds)) +
            Math.max(...list(style.animationDelay).map(seconds));
      return Math.max(transition, animation);
    }),
  );
};

test.describe('motion', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  test('animates by default (control for the reduced-motion test)', async ({
    page,
  }) => {
    await gotoApp(page, '/resources');
    await expect(page.getByRole('list', { name: 'Resources' })).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeGreaterThan(0.1);
  });

  test('honours prefers-reduced-motion everywhere', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoApp(page, '/resources');
    await expect(page.getByRole('list', { name: 'Resources' })).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeLessThanOrEqual(0.1);

    await page.getByRole('button', { name: 'New resource' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeLessThanOrEqual(0.1);
  });
});
// starter:reference-end
