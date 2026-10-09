import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
import { DemoProposalRepository } from '../../../demo/demo-proposals';
import { NewLogbookDialog } from './new-logbook-dialog';

describe('NewLogbookDialog', () => {
  let fixture: ComponentFixture<NewLogbookDialog>;
  let loader: HarnessLoader;
  let ref: jasmine.SpyObj<MatDialogRef<NewLogbookDialog>>;

  beforeEach(async () => {
    ref = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: ref },
        { provide: ProposalRepository, useClass: DemoProposalRepository },
      ],
    });
    fixture = TestBed.createComponent(NewLogbookDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  const createButton = () => loader.getHarness(MatButtonHarness.with({ text: 'Create' }));

  it('cannot create a logbook without a title', async () => {
    expect(await (await createButton()).isDisabled()).toBeTrue();

    await (await loader.getHarness(MatInputHarness)).setValue('   ');
    expect(await (await createButton()).isDisabled()).toBeTrue();
  });

  it('creates a logbook with the trimmed title and description', async () => {
    const [title, description] = await loader.getAllHarnesses(MatInputHarness);
    await title.setValue('  Beamtime 1  ');
    await description.setValue(' notes ');

    await (await createButton()).click();

    expect(ref.close).toHaveBeenCalledOnceWith({
      title: 'Beamtime 1',
      description: 'notes',
      proposalId: null,
      instrument: null,
    });
  });

  it('fills in the instrument and a title when a proposal is chosen', async () => {
    const [proposal] = await loader.getAllHarnesses(MatSelectHarness);
    await proposal.open();
    await proposal.clickOptions({ text: /2026-0377/ });

    const [title] = await loader.getAllHarnesses(MatInputHarness);
    expect(await title.getValue()).toBe('ESTIA – Hydrogen uptake in Pd thin films');
    const [, instrument] = await loader.getAllHarnesses(MatSelectHarness);
    expect(await instrument.getValueText()).toBe('ESTIA');
  });

  it('keeps a title the user already typed when a proposal is chosen', async () => {
    const [title] = await loader.getAllHarnesses(MatInputHarness);
    await title.setValue('My own title');

    const [proposal] = await loader.getAllHarnesses(MatSelectHarness);
    await proposal.open();
    await proposal.clickOptions({ text: /2026-0377/ });

    expect(await title.getValue()).toBe('My own title');
  });

  it('offers the facility instruments', async () => {
    const [, instrument] = await loader.getAllHarnesses(MatSelectHarness);
    await instrument.open();

    const names = await Promise.all((await instrument.getOptions()).map((o) => o.getText()));
    expect(names).toContain('LoKI');
    expect(names[0]).toBe('None');
  });
});
