import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  ContactsRequestParams,
  FocusedFollowupSettingsUsecase,
} from '@ups-crm-store';
import {
  BehaviorSubject,
  Observable,
  Subject,
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
import { FocusedFollowUpStore } from 'projects/crm-store/src/lib/data/store/focused-follow-up/focused-follow-up.store';
import * as R from 'ramda';

@UntilDestroy()
@Component({
  selector: 'crm-focused-followup',
  templateUrl: './focused-followup.component.html',
  styleUrl: './focused-followup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FocusedFollowUpStore, AvailableFiltersToFiltersPipe],
})
export class FocusedFollowupComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  constructor(
    protected focusedFollowUpStore: FocusedFollowUpStore,
    protected pageTitlePortal: PageTitlePortalService,
    protected filterService: FiltersService,
    protected getQueryParamsUsecase: GetQueryParamsUsecase,
    protected tenantUsecase: TenantUsecase,
    protected availableFiltersToFiltersPipe: AvailableFiltersToFiltersPipe,
    protected focusedFollowupSettingsUsecase: FocusedFollowupSettingsUsecase
  ) {}

  @Input() header: string;

  @ViewChild(CdkPortal) pageTitle: CdkPortal;

  pageTitleInfo = {
    title: '',
    icon: 'adjust',
  };

  apiEndpoint = '/focused-followup';

  defaultParams = {};

  contacts$: Observable<any[]> = this.focusedFollowUpStore.data$;

  title: string;

  ngOnInit(): void {
    this.getFocusedFollowUp().pipe(untilDestroyed(this)).subscribe();

  
  }

  ngOnDestroy(): void {
    if (this.pageTitle?.isAttached) {
      this.pageTitle.detach();
      this.pageTitlePortal.setPortal(null);
    }
    this.filterService.customFilters$.next(null);
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

  getFocusedFollowupSettings$ =
    this.focusedFollowupSettingsUsecase.getFocusedFollowupSettings$;

  loaded$ = this.focusedFollowUpStore.loaded$;

  error$ = this.focusedFollowUpStore.error$;

  availableFilters$ = this.focusedFollowUpStore.availableFilters$;

  params$ = this.filterService.queryParams$;

  totalIndexCount$ = this.focusedFollowUpStore.getTotalIndex$;

  loading$ = this.focusedFollowUpStore.loading$;

  queryFacets$ = this.focusedFollowUpStore.queryFacetsInResponse$;

  handleError(error: string, urlParams, contacts) {
    if (error === 'Invalid assignedTo was requested') {
      const { assignedTo, contactId, ...params } = urlParams;
      this.loadData(params);
      this.navigateToDefaultPath(contacts, params);
    }
  }

  protected loadData(params) {
    this.focusedFollowUpStore.getFocusedFollowUpContact$({
      params: { ...params, ...this.defaultParams },
    });
  }

  protected navigateToDefaultPath(contacts, urlParams = {}) {
    debugger;
    this.filterService.navigateToPath([], {
      ...urlParams,
      contactId: contacts?.[0]?.contactId,
    });
  }

  protected setupCustomFilters(availableFilters) {
    console.log('available filters', availableFilters);

    if (availableFilters) {
      this.filterService.customFilters$.next({
        data: availableFilters,
        transform: this.availableFiltersToFiltersPipe.transform.bind(this),
      });
    }
  }

  handleContactClick(contactId: ContactId, params: Params) {
    if (!!params && !!contactId) {
      const { contactId: _excluded, ...rest } = params;
      this.navigating.next(true);
      this.filterService.navigateToPath([], { contactId, ...rest });
    }
  }

  // protected getFocusedFollowUp() {
  //   return combineLatest([
  //     this.params$.pipe(distinctUntilChanged()),
  //     this.availableFilters$?.pipe(distinctUntilChanged()),
  //     this.contacts$,
  //     this.loading$,
  //     this.error$,
  //   ]).pipe(
  //     debounceTime(250),
  //     tap(([urlParams, availableFilters, contacts, , error]) => {
  //       if (error) {
  //         this.handleError(error, urlParams, contacts);
  //       } else {
  //         this.determineLoadingOrRedirecting(
  //           urlParams,
  //           availableFilters,
  //           contacts
  //         );
  //         this.setupCustomFilters(availableFilters);
  //       }
  //     }),
  //     filter(([urlParams, availableFilters, , loading, error]) => {
  //       const urlParamLength = Object.keys(urlParams).length;
  //       return urlParamLength && availableFilters && !loading && !error;
  //     }),
  //     map(([urlParams, queryFacets, contacts, avFilters, , , , ,]) => {
  //       const { contactId, ...rParams } = urlParams;

  //       // Check and remove URL params that aren't "available"
  //       const paramsNonExist = this.paramsIneligible(rParams, avFilters);
  //       if (Object.keys(paramsNonExist).length > 0) {
  //         this.redirectWithoutUnavailableParams(paramsNonExist, rParams);
  //         return;
  //       }
  //     })
  //   );
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
          console.log('rParams', rParams);
          console.log('urlParams', urlParams);
          console.log('contacts', contacts);
          console.log('contactId', contactId);
          console.log('timezone', timezone);

          this.loadDataOrWaitWhileUsingList(
            rParams,
            urlParams,
            contacts,

            timezone
          );
        }
      )
    );
  }

  /**
   * Checks if params in url are available in the response
   */
  protected paramsIneligible(params, availableFilters) {
    const { date, ...urlParams } = params;
    const filteredParams: any = this.filterService.filterEmptyParams(urlParams);
    const paramLength = Object.keys(filteredParams)?.length;
    if (paramLength && availableFilters) {
      const toArray =
        this.filterService.splitQueryParamsIntoArrays(filteredParams);
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

  protected redirectWithoutUnavailableParams(unavailableParams, pathParams) {
    console.log('unavailable params', unavailableParams);
    console.log('pathparams', pathParams);

    const { date, ...urlParams } = pathParams;
    const params = this.filterService.splitQueryParamsIntoArrays(urlParams);
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
    this.filterService.navigateToPath([], {
      ...filteredParams,
    });
    this.loadData(filteredParams);
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
    console.log(
      'determineLoadingOrRedirecting availableFilters',
      availableFilters
    );

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
      const sendParams = this.filterService.filterEmptyParams(
        this.filterService.buildQueryParamsFromResponse(rest, false)
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

  protected loadDataOrWaitWhileUsingList(
    params,
    urlParams,
    contacts,
    timezone
  ) {
    const { contactId, ...restOfData } = urlParams;

    console.log('loadDataOrWaitWhileUsingList contactId', contactId);

    console.log('restOfData,', { ...restOfData });
    const test: any = this.convertStringValuesToArray(restOfData);

    // const { nextStepDate, sort, unworked, ...restOfFacets } = queryFacets;
    const paramsBuilt = this.filterService.filterEmptyParams(
      this.filterService.buildQueryParamsFromResponse(params, false)
    );
    const paramsCheck =
      this.filterService.splitQueryParamsIntoArrays(paramsBuilt);
    const facetsBuilt = this.filterService.filterEmptyParams(
      this.filterService.transformObjectRecursive(
        this.filterService.fromServerToLocal(test, timezone)
      )
    );

    console.log('facetsBuilt', facetsBuilt);
    console.log('paramsCheck', paramsCheck);

    const paramsMatchFacets = R.equals(paramsCheck, facetsBuilt);

    console.log('paramsMatchFacets', paramsMatchFacets);

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

  convertStringValuesToArray(inputObject, delimiter = ',') {
    const resultObject = {};

    for (const [key, value] of Object.entries(inputObject)) {
      if (typeof value === 'string') {
        const valuesArray = value.trim().split(delimiter);
        resultObject[key] =
          valuesArray.length > 1 || valuesArray[0] !== '' ? valuesArray : value;
      } else {
        resultObject[key] = value;
      }
    }

    return resultObject;
  }
}
