import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogbookPager } from './logbook-pager';

describe('LogbookPager', () => {
  let fixture: ComponentFixture<LogbookPager>;

  const create = async (flat?: boolean) => {
    fixture = TestBed.createComponent(LogbookPager);
    fixture.componentRef.setInput('length', 30);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('pageIndex', 0);
    fixture.componentRef.setInput('pageSizes', [10, 25]);
    if (flat !== undefined) {
      fixture.componentRef.setInput('flat', flat);
    }
    await fixture.whenStable();
  };
  const el = () => fixture.nativeElement as HTMLElement;

  it('shows the range of the current page', async () => {
    await create();
    expect(el().querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain(
      '1 – 10 of 30',
    );
  });

  it('tells the list when another page is asked for', async () => {
    await create();
    const pages: number[] = [];
    fixture.componentInstance.page.subscribe((event) => pages.push(event.pageIndex));

    el().querySelector<HTMLButtonElement>('.mat-mdc-paginator-navigation-next')!.click();

    expect(pages).toEqual([1]);
  });

  it('is a bar of its own, or the footer of a table when flat', async () => {
    await create();
    expect(el().classList.contains('flat')).toBeFalse();

    fixture.componentRef.setInput('flat', true);
    await fixture.whenStable();
    expect(el().classList.contains('flat')).toBeTrue();
  });
});
