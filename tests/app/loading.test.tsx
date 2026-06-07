import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from '@/app/loading';

describe('Loading', () => {
  it('announces the loading state politely', () => {
    const { getByRole } = render(<Loading />);
    const status = getByRole('status');

    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('loading...');
  });
});
