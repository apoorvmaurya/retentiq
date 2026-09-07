import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CodeSnippet from '../CodeSnippet';
import * as clipboardModule from '@/lib/clipboard';

describe('CodeSnippet Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders single code snippet and copies text when clicking copy button', async () => {
    const copySpy = vi.spyOn(clipboardModule, 'copyToClipboard').mockResolvedValue(true);

    render(
      <CodeSnippet
        title="Quick Start"
        code="curl -X POST https://api.retentiq.com/api/events/ingest"
        language="bash"
      />,
    );

    expect(screen.getByText('Quick Start')).toBeDefined();
    expect(screen.getByText('bash')).toBeDefined();
    expect(screen.getByText(/curl -X POST/)).toBeDefined();

    const copyBtn = screen.getByRole('button', { name: /copy code to clipboard/i });
    fireEvent.click(copyBtn);

    expect(copySpy).toHaveBeenCalledWith('curl -X POST https://api.retentiq.com/api/events/ingest');
    expect(await screen.findByText('Copied')).toBeDefined();
  });

  it('renders tabs and switches active code snippet', () => {
    const tabs = [
      { id: 'curl', label: 'cURL', code: 'curl -X GET /health', language: 'bash' },
      { id: 'json', label: 'JSON', code: '{"status": "ok"}', language: 'json' },
    ];

    render(<CodeSnippet tabs={tabs} />);

    expect(screen.getByText('curl -X GET /health')).toBeDefined();

    // Click JSON tab
    const jsonTabBtn = screen.getByRole('button', { name: 'JSON' });
    fireEvent.click(jsonTabBtn);

    expect(screen.getByText('{"status": "ok"}')).toBeDefined();
  });
});
