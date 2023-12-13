import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import { UpEngagementHistoryModel, UpHistoryModel } from '@ups-lib';
import { TypeaheadContactNameUsecase } from '@ups-search-store';
import {
  Observable,
  Subject,
  concatMap,
  debounceTime,
  map,
  of,
  startWith,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'up-engagement-traffic-history',
  templateUrl: './engagement-traffic-history.component.html',
  styleUrls: ['./engagement-traffic-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngagementTrafficHistoryComponent
  implements OnChanges, AfterViewInit
{
  constructor(
    private typeAheadContact: TypeaheadContactNameUsecase,
    private cdr: ChangeDetectorRef
  ) {
    this.tests = [];
  }

  @Input() dataSource!: UpEngagementHistoryModel[];

  @Input() skeleton: boolean = false;

  @Input() crmEnabled = false;

  @ViewChild('contactName') contactName: ElementRef;

  @ViewChild('divElement') formElement: ElementRef;

  public stateInputChange$: Subject<string> = new Subject<string>();

  destroyed$ = new Subject<boolean>();

  filteredContactNameOps: {
    label: string;
    value: string;
    contactId: string;
  }[];

  series = [
    {
      name: 'Information Gathered Score',
      value: 74,
      label: '20%',
    },
  ];
  colorScheme = {
    domain: ['#91b9ea'],
  };

  displayedColumns: string[] = [
    'salesperson',
    'trafficType',
    'contactName',
    'notes',
    'time',
    'duration',
  ];

  //chagnes
  selectedContactIndex;

  tests: any[] = [];

  source: string = 'EngagementLog';
  selectedContactId: string;

  ngAfterViewInit() {
    this.stateInputChange$
      .pipe(
        startWith(''),
        debounceTime(250),
        concatMap((value) => {
          if (!value) {
            this.resetSelectedContactId();
          }

          if (value && value.length >= 2) {
            return this.filterTypeAhead(value);
          }

          return of(null);
        })
      )
      .pipe(takeUntil(this.destroyed$))
      .subscribe((res) => {
        this.filteredContactNameOps = res;
        this.cdr.detectChanges();

        if (!this.contactName.nativeElement.value.trim()) {
          this.resetSelectedContactId();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.crmEnabled?.firstChange && !changes.crmEnabled?.currentValue) {
      this.displayedColumns = [
        ...this.displayedColumns.filter((i) => i !== 'notes'),
      ];
    }
  }

  isGroup = (_index, item): boolean => {
    return item.isGroupBy;
  };

  trackById = (index, item) => {
    return item.id || index;
  };

  onInputFocus(value: string) {
    if (value.trim() === '') {
      this.resetSelectedContactId();
    }
  }

  @Output() submitContactPerson = new EventEmitter<{
    data: {
      assignedTo: string;
      firstName: string;
      lastName?: string;
      source: string;
      claimId: string;
    };
    upTapeId: string;
  }>();

  @Output() submitContactFromTheList = new EventEmitter<{
    data: {
      touchId: string;
      contactId: string;
      claimId: string;
      firstName: string;
      lastName?: string;
    };
    upTapeId: string;
  }>();

  @Output() submitUpdateNotes = new EventEmitter<{
    payload: {
      notes: string;
      contactId: string;
    };
    claimId: string;
  }>();

  @Output() submitUpdateQualification = new EventEmitter<{
    payload: {
      contactId: string;
      qualification: string;
      toggleValue: boolean;
    };
    source: string;
    claimId: string;
  }>();

  filterTypeAhead(
    val: string
  ): Observable<{ label: string; value: string; contactId: string }[]> {
    return this.typeAheadContact.executeOnlyTheQuery(val).pipe(
      map((response) =>
        response.map((i) => ({
          label: i.highlight || i.fullName,
          value: i.fullName,
          contactId: i.contactId,
        }))
      )
    );
  }

  resetSelectedContactId() {
    this.selectedContactId = null;
  }

  autoCompleteSelected($event: MatAutocompleteSelectedEvent) {
    const selectedOption = $event.option.value;
    const contactId = selectedOption.contactId;
    this.selectedContactId = contactId;

    this.selectedContactIndex = this.filteredContactNameOps.findIndex(
      (option) => option.contactId === contactId
    );

    this.tests.push(this.selectedContactId);

    const array = this.tests.map((item, index) => ({ [index]: item }));

    console.log(array);

    const idValue = this.contactName.nativeElement.getAttribute('id');
    console.log('ID Value:', idValue);
  }

  displayOptionValue(option: any): string {
    return option ? option.value : '';
  }

  handleContact(contactName: string, element: UpHistoryModel) {
    const { assignedTo, claimId, upTapeId, touchId } = element;

    const names = contactName.trim().split(' ');
    const data: {
      assignedTo: string;
      contactId: string;
      touchId: string;
      upTapeId: string;
      source: string;
      claimId: string;
      lastName?: string;
      firstName: string;
    } = {
      firstName:
        names.length <= 1
          ? names.at(-1)
          : names.slice(0, names.length - 1).join(' '),
      ...(names.length > 1 && { lastName: names.at(-1) }),
      assignedTo,
      source: this.source,
      claimId,
      touchId,
      upTapeId,
      contactId: undefined,
    };

    if (this.selectedContactId) {
      data.contactId = this.selectedContactId;
      data.touchId = touchId;
      console.log(data.contactId);

      // this.submitContactFromTheList.emit({ data, upTapeId });
    } else {
      console.log('newId');

      // this.submitContactPerson.emit({ data, upTapeId });
    }
  }

  handleNotes(notes: string, contactId: string, claimId: string) {
    this.submitUpdateNotes.emit({
      payload: {
        notes,
        contactId,
      },
      claimId,
    });
  }

  handleToggleQualification(
    { rating, toggleValue },
    claimId: string,
    contactId: string
  ) {
    if (!rating) {
      return;
    }

    const qualification = rating === 'Hot' ? 'Hot' : 'Cold';

    const data = {
      claimId,
      payload: {
        qualification,
        contactId,
        toggleValue,
      },
      source: this.source,
    };

    this.submitUpdateQualification.emit(data);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
