import type { Mock } from 'vitest';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideTestProposals } from '../../../testing/test-proposals';
import { InsertSampleDialog } from './insert-sample-dialog';

describe('InsertSampleDialog', () => {
  let fixture: ComponentFixture<InsertSampleDialog>;
  let loader: HarnessLoader;
  let ref: Record<'close', Mock>;

  beforeEach(async () => {
    ref = {
      close: vi.fn().mockName('MatDialogRef.close'),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: ref },
        provideTestProposals(),
      ],
    });
    fixture = TestBed.createComponent(InsertSampleDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  const selects = () => loader.getAllHarnesses(MatSelectHarness);
  const insert = () => loader.getHarness(MatButtonHarness.with({ text: 'Insert' }));

  const choose = async (select: MatSelectHarness, text: RegExp) => {
    await select.open();
    await select.clickOptions({ text });
  };

  it('cannot insert before a proposal and a sample are chosen, and the sample list waits for the proposal', async () => {
    const [, sample] = await selects();
    expect(await sample.isDisabled()).toBe(true);
    expect(await (await insert()).isDisabled()).toBe(true);

    const [proposal] = await selects();
    await choose(proposal, /2026-0412/);
    expect(await sample.isDisabled()).toBe(false);
    expect(await (await insert()).isDisabled()).toBe(true);
  });

  it('lists only the samples of the chosen proposal', async () => {
    const [proposal, sample] = await selects();
    await choose(proposal, /2026-0290/);
    await sample.open();

    const names = await Promise.all((await sample.getOptions()).map((o) => o.getText()));
    expect(names).toEqual(['S-0207 – NMC811 pristine', 'S-0208 – NMC811 after 500 cycles']);
  });

  it('inserts the chosen sample with its proposal and instrument', async () => {
    const [proposal, sample] = await selects();
    await choose(proposal, /2026-0412/);
    await choose(sample, /S-0031/);

    await (await insert()).click();

    expect(ref.close).toHaveBeenCalledTimes(1);

    expect(ref.close).toHaveBeenCalledWith({
      proposalId: '2026-0412',
      proposalTitle: 'Micelle structure under shear',
      instrument: 'LoKI',
      sampleId: 'S-0031',
      sampleName: 'SDS 5 wt% in D2O',
      formula: 'C12H25NaO4S',
    });
  });

  it('forgets the sample when another proposal is chosen', async () => {
    const [proposal, sample] = await selects();
    await choose(proposal, /2026-0412/);
    await choose(sample, /S-0031/);

    await choose(proposal, /2026-0290/);

    expect(await (await insert()).isDisabled()).toBe(true);
  });
});
