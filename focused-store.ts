import { Injectable } from '@angular/core';
import { ComponentStore, tapResponse } from '@ngrx/component-store';
import { ContactsRequestParams, FocusedFollowUpResponse } from '../../models';
import { ContactRepository } from '../../repositories';
import {
  BehaviorSubject,
  Observable,
  concatMap,
  switchMap,
  tap,
  throwError,
  withLatestFrom,
} from 'rxjs';

export interface FocusedFollowState extends FocusedFollowUpResponse {
  loading: boolean;
  loaded: boolean;
  error: string;
}

const defaultState: FocusedFollowState = {
  accessTagsQuery: undefined,
  assignedTo: undefined,
  availableFilters: undefined,
  data: [],
  loading: false,
  loaded: false,
  error: undefined,
};

@Injectable()
export class FocusedFollowUpStore extends ComponentStore<FocusedFollowState> {
  constructor(private contactRepo: ContactRepository) {
    super(defaultState);

    const assignedTo = {};

    this.contactRepo.getFocusedFollowUpContacts().subscribe((data) => {
      console.log(data);
    });
  }

  endpoint$ = new BehaviorSubject(null);

  data$ = this.select(({ data }) => data);

  loading$ = this.select(({ loading }) => loading);

  loaded$ = this.select(({ loaded }) => loaded);

  error$ = this.select(({ error }) => error);

  availableFilters$ = this.select(({ availableFilters }) => availableFilters);

  readonly setFocusedFollowUpLoading = this.updater(
    (state, loading: boolean) => ({
      ...state,
      loading,
      error: undefined,
    })
  );

  readonly getFocusedFollowUpContactSuccess = this.updater(
    (
      state,
      data: {
        response: FocusedFollowUpResponse;
      }
    ) => {
      return {
        ...state,
        ...data.response,
        loaded: true,
        loading: false,
        error: undefined,
      };
    }
  );

  readonly getFocusedFollowUpContactPageSuccess = this.updater(
    (state, data: { response: FocusedFollowUpResponse }) => {
      return {
        ...state,
        ...data.response,
        data: [...state.data, ...data.response.data],
        error: undefined,
      };
    }
  );

  readonly getFocusedFollowUpContactFailure = this.updater(
    (state, error: { error: { name: string; message: string } }) => {
      return {
        ...state,
        loaded: false,
        loading: false,
        error: error?.error?.message ?? 'Unexpected error',
      };
    }
  );

  // getFocusedFollowUpContact$ = this.effect(
  //   (params$: Observable<{ params: ContactsRequestParams }>) => {
  //     return params$.pipe(
  //       concatMap((data: { params: ContactsRequestParams }) => {
  //         this.setFocusedFollowUpLoading(true);

  //         return this.contactRepo.getFocusedFollowUpContacts().pipe(
  //           tapResponse(
  //             (response) => {
  //               this.getFocusedFollowUpContactSuccess({
  //                 response,
  //               });
  //             },
  //             (error: any) => {
  //               this.getFocusedFollowUpContactFailure({ error });
  //             }
  //           )
  //         );
  //       })
  //     );
  //   }
  // );

  getFocusedFollowUpContacts$ = this.effect(() => {
    this.setFocusedFollowUpLoading(true);
    return this.contactRepo.getFocusedFollowUpContacts().pipe(
      tap((response: FocusedFollowUpResponse) => {
        this.getFocusedFollowUpContactSuccess({
          response,
        });
      })
    );
  });
}
