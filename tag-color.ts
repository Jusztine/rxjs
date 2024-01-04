//datasource
addContactTagColor(tagName: string, tagColor: string): Observable<Boolean> {
    return this.http
      .post(
        `${this.env.userApp}/preferences/tag-color`,
        {
          tagName: tagName,
          color: tagColor,
        },
        {
          withCredentials: true,
          observe: 'response',
        }
      )
      .pipe(
        map((response) => true),
        catchError((error: UserError) => this.handleError(error))
      );
  }


//actions
export const addContactTagColorAttempted = createAction(
  '[CRM Users] Add Contact Tag Color Attempted',
  props<{ tagName: string; color: string }>()
);

export const addContactTagColorFailed = createAction(
  '[CRM Users] Add Contact Tag Color Failed'
);

export const addContactTagColorSucceeded = createAction(
  '[CRM Users] Add Contact Tag Color Succeeded',
  props<{
    tagName: string;
    color: string;
  }>()
);


//effects
  addContactTagColorAttempted$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromStore.addContactTagColorAttempted),
      switchMap((action) => {
        const { tagName, color } = action;
        return this.userDatasource.addContactTagColor(tagName, color).pipe(
          switchMap(() => {
            return [
              fromStore.addContactTagColorSucceeded({
                color,
                tagName,
              }),
            ];
          }),
          catchError((error) => {
            return [
              fromStore.addContactTagColorFailed(),
              fromRoutingStore.showSnackbar({
                message: error.message || 'Failed to add tag color.',
                button: 'X',
                level: 'error',
              }),
            ];
          })
        );
      })
    );
  });
