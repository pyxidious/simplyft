import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = route.data?.['roles'] as string[] | undefined;
  const check = () => {
    const user = auth.currentUser();
    if (!user) {
      return router.parseUrl('/login');
    }
    if (roles?.length && !roles.includes(user.role)) {
      return router.parseUrl(auth.landingPathFor(user));
    }
    return true;
  };
  return auth.currentUser() ? check() : auth.restoreSession().pipe(map(() => check()));
};
