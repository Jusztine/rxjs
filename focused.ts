import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContactsRequestParams, DueToCallContact } from '@ups-crm-store';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  take,
  tap,
} from 'rxjs';
import { CdkPortal } from '@angular/cdk/portal';
import {
  ContactId,
  FiltersService,
  PageTitlePortalService,
} from '@ups-mfe-shell-commons';
import { GetQueryParamsUsecase } from '@routing-store';
import { TenantUsecase } from '@ups-users-store';
import { Params } from '@angular/router';
import { AvailableFiltersToFiltersPipe } from '../../pipes';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { GetAccessTagsUsecase } from '@ups-auth-store';
import { GetCountRequestParams } from '@ups-metrics-store';
import * as R from 'ramda';
import { FocusedFollowUpStore } from 'projects/crm-store/src/lib/data/store/focused-follow-up/focused-follow-up.store';

@UntilDestroy()
@Component({
  selector: 'crm-focused-followup',
  templateUrl: './focused-followup.component.html',
  styleUrl: './focused-followup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FocusedFollowUpStore, AvailableFiltersToFiltersPipe],
})
export class FocusedFollowupComponent implements OnInit {
  constructor(
    protected focusedFollowUpStore: FocusedFollowUpStore,
    protected pageTitlePortal: PageTitlePortalService,
    protected sFilterService: FiltersService,
    protected getQueryParamsUsecase: GetQueryParamsUsecase,
    protected tenantUsecase: TenantUsecase,
    protected availableFiltersToFiltersPipe: AvailableFiltersToFiltersPipe
  ) {
    this.contacts$.subscribe((data) => {
      console.log('component', data);
    });

    // const params = { : '4aabcb66-6483-4aa6-9ee3-4aedae8c56ec' };

    // const test = this.loadData(params);
    // console.log('tes', test);

    focusedFollowUpStore.endpoint$.next(this.apiEndpoint);
  }

  @Input() header = 'Focused Follow Up';

  @ViewChild(CdkPortal) pageTitle: CdkPortal;

  apiEndpoint = '/focused-followup';

  pageTitleInfo = {
    title: 'Focused Follow Up',
    icon: 'adjust',
  };

  defaultParams = {};

  //code before

  contacts$: Observable<any[]> = this.focusedFollowUpStore.data$;

  ngOnDestroy(): void {
    if (this.pageTitle?.isAttached) {
      this.pageTitle.detach();
      this.pageTitlePortal.setPortal(null);
    }
    this.sFilterService.customFilters$.next(null);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.pageTitlePortal.setPortal(this.pageTitle);
    });
  }

  listOpen$ = new BehaviorSubject(false);

  navigating = new BehaviorSubject<boolean>(false);

  initialLoadup$ = new BehaviorSubject<boolean>(false);

  navigatingWithinList$ = new BehaviorSubject<boolean>(false);

  loadingMoreDebounce$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );

  currentContactId$ = this.getQueryParamsUsecase.queryParams$.pipe(
    map((params) => params?.contactId)
  );

  currentIndex$ = combineLatest([this.currentContactId$, this.contacts$]).pipe(
    map(([contactId, contacts]) =>
      contacts.findIndex((c) => c.contactId === contactId)
    )
  );

  activeContactId: string;

  data$ = this.contacts$.subscribe((data) => {
    console.log((this.activeContactId = data[0]?.contactId));
  });

  loading$ = this.focusedFollowUpStore.loading$;

  loaded$ = this.focusedFollowUpStore.loaded$;

  error$ = this.focusedFollowUpStore.error$;

  availableFilters$ = this.focusedFollowUpStore.availableFilters$;

  queryFacets$ = this.focusedFollowUpStore.queryFacetsInResponse$;

  params$ = this.sFilterService.queryParams$;

  totalIndexCount$ = this.focusedFollowUpStore.getTotalIndex$;

  ngOnInit(): void {
    this.getFocusedFollowUp().pipe(untilDestroyed(this)).subscribe();
  }

  handleError(error: string, urlParams, contacts) {
    if (error === 'Invalid assignedTo was requested') {
      const { assignedTo, contactId, ...params } = urlParams;
      this.navigateToDefaultPath(contacts, params);
      this.loadData(params);
    }
  }

  protected navigateToDefaultPath(contacts, urlParams = {}) {
    this.sFilterService.navigateToPath([], {
      ...urlParams,
      contactId: contacts?.[0]?.contactId,
    });
  }

  protected loadData(params: ContactsRequestParams) {
    console.log(params);

    // this.focusedFollowUpStore.getFocusedFollowUpContacts$();
    this.focusedFollowUpStore.getFocusedFollowUpContact$({
      params: { ...params },
    });
  }

  protected setupCustomFilters(availableFilters) {
    console.log(availableFilters);

    if (availableFilters) {
      this.sFilterService.customFilters$.next({
        data: availableFilters,
        transform: this.availableFiltersToFiltersPipe.transform.bind(this),
      });
    }
  }

  handleContactClick(contactId: ContactId, params: Params) {
    console.log(contactId);

    if (!!params && !!contactId) {
      const { contactId: _excluded, ...rest } = params;
      this.navigating.next(true);
      this.sFilterService.navigateToPath([], { contactId, ...rest });
    }
  }

  // protected getFocusedFollowUp() {
  //   return combineLatest([
  //     this.params$.pipe(distinctUntilChanged()),
  //     this.availableFilters$.pipe(distinctUntilChanged()),
  //     this.contacts$,
  //     this.loading$,
  //     this.error$,
  //     this.tenantUsecase.tenantTimezone$
  //   ]).pipe(
  //     debounceTime(250),
  //     tap(([urlParams, availableFilters, , contacts, error]) => {
  //       if( error) {
  //         this.handleError(error, urlParams, contacts )
  //       } else {
  //         this.determineLoadingOrRedirecting(
  //           urlParams,
  //           availableFilters,
  //           contacts
  //         )
  //         this.setupCustomFilters(availableFilters)
  //       }
  //     }),
  //    filter(([urlParams, availableFilters, , , loading, error]) => {
  //     const
  //    })
  //   )
  // }

  protected getFocusedFollowUp() {
    return combineLatest([
      this.params$.pipe(distinctUntilChanged()),
      this.availableFilters$.pipe(distinctUntilChanged()),
      this.queryFacets$.pipe(distinctUntilChanged()),
      this.contacts$,
      this.loading$,
      this.error$,
      this.tenantUsecase.tenantTimezone$,
    ]).pipe(
      debounceTime(250),
      tap(([urlParams, availableFilters, , contacts, , error]) => {
        if (error) {
          this.handleError(error, urlParams, contacts);
        } else {
          this.determineLoadingOrRedirecting(
            urlParams,
            availableFilters,
            contacts
          );
          this.setupCustomFilters(availableFilters);
        }
      }),
      filter(([urlParams, availableFilters, , , loading, error]) => {
        const urlParamLength = Object.keys(urlParams).length;
        return urlParamLength && availableFilters && !loading && !error;
      }),
      map(
        ([urlParams, avFilters, queryFacets, contacts, , error, timezone]) => {
          const { contactId, ...rParams } = urlParams;

          // Check and remove URL params that aren't "available"
          const paramsNonExist = this.paramsIneligible(rParams, avFilters);
          if (Object.keys(paramsNonExist).length > 0) {
            this.redirectWithoutUnavailableParams(paramsNonExist, rParams);
            return;
          }

          this.loadDataOrWaitWhileUsingList(
            rParams,
            urlParams,
            queryFacets,
            contacts,
            contactId,
            timezone
          );
        }
      )
    );
  }

  protected loadDataOrWaitWhileUsingList(
    params,
    urlParams,
    queryFacets,
    contacts,
    contactId,
    timezone
  ) {
    const { nextStepDate, sort, unworked, ...restOfFacets } = queryFacets;

    console.log('queryFacets', queryFacets);

    const paramsBuilt = this.sFilterService.filterEmptyParams(
      this.sFilterService.buildQueryParamsFromResponse(params, false)
    );
    const paramsCheck =
      this.sFilterService.splitQueryParamsIntoArrays(paramsBuilt);
    const facetsBuilt = this.sFilterService.filterEmptyParams(
      this.sFilterService.transformObjectRecursive(
        this.sFilterService.fromServerToLocal(restOfFacets, timezone)
      )
    );
    const paramsMatchFacets = R.equals(paramsCheck, facetsBuilt);
    if (!paramsMatchFacets) {
      this.loadData(paramsBuilt);
    } else if (
      paramsMatchFacets &&
      contacts.length &&
      contactId !== contacts?.[0].contactId
    ) {
      if (!this.navigatingWithinList$.getValue()) {
        this.navigateToDefaultPath(contacts, urlParams);
      } else {
        this.navigatingWithinList$.next(false);
      }
    }
  }

  /**
   * Left the if/else separate for clarity, hopefully
   * @param urlParams
   * @param availableFilters
   * @param contacts
   * @private
   */
  protected determineLoadingOrRedirecting(
    urlParams,
    availableFilters,
    contacts
  ) {
    if (this.initialLoadup$.getValue()) {
      return;
    }
    const paramLength = Object.keys(urlParams)?.length;
    if (!paramLength && !availableFilters) {
      // There are no params so load up initial data
      this.loadData({});
    } else if (!paramLength && availableFilters && contacts.length) {
      // We have data, but haven't redirected yet.
      this.navigateToDefaultPath(contacts);
      this.initialLoadup$.next(true);
    } else if (paramLength && !availableFilters) {
      // Landed on the page with parameters already
      const { contactId, ...rest } = urlParams;
      const sendParams = this.sFilterService.filterEmptyParams(
        this.sFilterService.buildQueryParamsFromResponse(rest, false)
      );
      if (contactId) {
        this.navigatingWithinList$.next(true);
      }
      this.loadData(sendParams);
    } else if (
      paramLength &&
      !urlParams?.contactId &&
      availableFilters &&
      contacts.length
    ) {
      // There is data, but no contact id in the params.
      this.navigateToDefaultPath(contacts, urlParams);
      this.initialLoadup$.next(true);
    }
  }

  protected redirectWithoutUnavailableParams(unavailableParams, pathParams) {
    const { date, ...urlParams } = pathParams;
    const params = this.sFilterService.splitQueryParamsIntoArrays(urlParams);
    const filteredParams = Object.keys(params).reduce((acc, curr) => {
      if (unavailableParams[curr]) {
        return {
          ...acc,
          [curr]: params[curr]
            .filter((i) => !unavailableParams[curr].includes(i))
            .join(','),
        };
      }
      return { ...acc, [curr]: params[curr].join(',') };
    }, {});
    this.sFilterService.navigateToPath([], {
      ...filteredParams,
    });
    this.loadData(filteredParams);
  }

  /**
   * Checks if params in url are available in the response
   */
  protected paramsIneligible(params, availableFilters) {
    const { date, ...urlParams } = params;
    const filteredParams: any =
      this.sFilterService.filterEmptyParams(urlParams);
    const paramLength = Object.keys(filteredParams)?.length;
    if (paramLength && availableFilters) {
      const toArray =
        this.sFilterService.splitQueryParamsIntoArrays(filteredParams);
      return Object.keys(toArray).reduce((acc, curr) => {
        if (!availableFilters[curr]) {
          return { ...acc, [curr]: toArray[curr] };
        }
        const items = toArray[curr];
        items.forEach((item) => {
          if (!availableFilters[curr][item]) {
            if (!acc[curr]) {
              acc[curr] = [];
            }
            acc[curr].push(item);
          }
        });
        return { ...acc };
      }, {});
    }
    return {};
  }
}
