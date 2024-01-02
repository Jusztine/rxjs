//here crm data source

  getFocusedFollowUpContacts(
    focusedFollowUpParams: FocusedContactsRequestParams,
    endpoint?: string
  ): Observable<FocusedFollowUpResponse> {
    const params = this.setupParams(focusedFollowUpParams);

    return this.http
      .get(`${this.env.contactApp}${endpoint}`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map(
          (response: Record<string, any>) =>
            response.data as FocusedFollowUpResponse
        ),
        catchError((error: CrmError) => this.errorReport(error))
      );
  }


//model

interface FocusedResponse<T> {
  assignedTo: UserId[];
  querySort: QuerySort;
  queryFacets: QueryFacets;
  params: Params;
  data: T[];
  accessTagsQuery: AccessTagsQuery;
  availableFilters?: ContactsAvailableFilters;
}
export interface FocusedContactsRequestParams {
  accessTags?: { [id: Uuid]: Tag };
  assignedTo?: UserId;
}


//repository
  getFocusedFollowUpContacts(
    params: FocusedContactsRequestParams,
    endpoint?: string
  ): Observable<FocusedFollowUpResponse> {
    return this.contact.getFocusedFollowUpContacts(params, endpoint);
  }


//focused-store 
  getFocusedFollowUpContact$ = this.effect(
    (params$: Observable<{ params: FocusedContactsRequestParams }>) => {
      return params$.pipe(
        concatMap((data: { params: FocusedContactsRequestParams }) => {
          this.setFocusedFollowUpLoading(true);
          return this.contactRepo
            .getFocusedFollowUpContacts(data.params, this.endpoint$.value)
            .pipe(
              tapResponse(
                (response) => {
                  this.getFocusedFollowUpContactSuccess({
                    response,
                    params: data.params,
                  });
                },
                (error: any) => {
                  this.getFocusedFollowUpContactFailure({ error });
                }
              )
            );
        })
      );
    }
  );









