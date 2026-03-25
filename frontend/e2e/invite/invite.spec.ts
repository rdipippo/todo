import { test, expect, ApiMock, mockUser, mockTodo, setupAuth } from '../fixtures';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const owner = mockUser({ id: 1, email: 'owner@example.com', first_name: 'Alice', last_name: 'Owner' });

const memberAllPerms = mockUser({
  id: 2,
  email: 'member@example.com',
  first_name: 'Bob',
  last_name: 'Member',
  group_owner_id: 1,
  group_can_manage: false,
  perm_create_tasks: true,
  perm_edit_tasks: true,
  perm_delete_tasks: true,
  perm_assign_tasks: true,
});

const memberLimitedPerms = mockUser({
  id: 3,
  email: 'limited@example.com',
  first_name: 'Carol',
  last_name: 'Limited',
  group_owner_id: 1,
  group_can_manage: false,
  perm_create_tasks: false,
  perm_edit_tasks: false,
  perm_delete_tasks: false,
  perm_assign_tasks: false,
});

const groupInfoWithMembers = {
  owner,
  members: [memberAllPerms],
  pendingInvites: [],
  canManage: true,
};

const groupInfoEmpty = {
  owner,
  members: [],
  pendingInvites: [],
  canManage: true,
};

const pendingInvite = {
  id: 10,
  email: 'pending@example.com',
  canManage: false,
  permCreateTasks: true,
  permEditTasks: false,
  permDeleteTasks: false,
  permAssignTasks: true,
  expiresAt: '2099-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoInvitePage(page: Parameters<typeof setupAuth>[0], api: ApiMock, user = owner) {
  await setupAuth(page, api, user);
  await page.goto('/invite');
}

// ---------------------------------------------------------------------------
// Invite Screen — display
// ---------------------------------------------------------------------------

test.describe('Invite Screen — display', () => {
  test('shows page heading and invite form for group owner', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await expect(page.getByRole('heading', { name: 'Invite Members' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Invitation' })).toBeVisible();
  });

  test('shows all four permission checkboxes checked by default', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await expect(page.getByLabel('Can create tasks')).toBeChecked();
    await expect(page.getByLabel('Can edit tasks')).toBeChecked();
    await expect(page.getByLabel('Can delete tasks')).toBeChecked();
    await expect(page.getByLabel('Can assign tasks to categories')).toBeChecked();
  });

  test('shows Task Permissions section heading', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await expect(page.getByText('Task Permissions')).toBeVisible();
  });

  test('shows group members list with owner badge', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoWithMembers);
    await gotoInvitePage(page, api);

    await expect(page.getByText('Alice Owner')).toBeVisible();
    await expect(page.getByText('Owner')).toBeVisible();
    await expect(page.getByText('Bob Member')).toBeVisible();
  });

  test('shows permission badges for members', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoWithMembers);
    await gotoInvitePage(page, api);

    const memberRow = page.locator('.member-item').filter({ hasText: 'Bob Member' });
    await expect(memberRow.locator('.perm-badge').filter({ hasText: 'Can create tasks' })).toBeVisible();
    await expect(memberRow.locator('.perm-badge').filter({ hasText: 'Can edit tasks' })).toBeVisible();
    await expect(memberRow.locator('.perm-badge').filter({ hasText: 'Can delete tasks' })).toBeVisible();
    await expect(memberRow.locator('.perm-badge').filter({ hasText: 'Can assign tasks to categories' })).toBeVisible();
  });

  test('does not show permission badges for permissions the member lacks', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', {
      ...groupInfoEmpty,
      members: [memberLimitedPerms],
    });
    await gotoInvitePage(page, api);

    const memberRow = page.locator('.member-item').filter({ hasText: 'Carol Limited' });
    await expect(memberRow.locator('.perm-badge')).toHaveCount(0);
  });

  test('shows pending invitation with email and expiry', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', { ...groupInfoEmpty, pendingInvites: [pendingInvite] });
    await gotoInvitePage(page, api);

    await expect(page.getByText('Pending Invitations')).toBeVisible();
    await expect(page.getByText('pending@example.com')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('hides invite form when member cannot manage group', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', { ...groupInfoEmpty, canManage: false });
    const nonManagingMember = mockUser({
      id: 4,
      email: 'readonly@example.com',
      group_owner_id: 1,
      group_can_manage: false,
    });
    await gotoInvitePage(page, api, nonManagingMember);

    await expect(page.getByPlaceholder('Enter email address')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Invitation' })).not.toBeVisible();
  });

  test('shows remove button for members when user can manage', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoWithMembers);
    await gotoInvitePage(page, api);

    const memberRow = page.locator('.member-item').filter({ hasText: 'Bob Member' });
    await expect(memberRow.getByRole('button', { name: 'Remove' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Invite Screen — sending invitations
// ---------------------------------------------------------------------------

test.describe('Invite Screen — sending invitations', () => {
  test('sends invitation with all permissions by default', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    api.onPost('/auth/invite', { message: 'Invitation sent successfully' });
    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('new@example.com');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
  });

  test('resets form fields after successful send', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    api.onPost('/auth/invite', { message: 'Invitation sent successfully' });
    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('reset@example.com');
    await page.getByLabel('Can delete tasks').uncheck();
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    await expect(page.getByPlaceholder('Enter email address')).toHaveValue('');
    await expect(page.getByLabel('Can create tasks')).toBeChecked();
    await expect(page.getByLabel('Can delete tasks')).toBeChecked();
  });

  test('shows error when a pending invitation already exists for that email', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    api.onPost('/auth/invite', { error: 'A pending invitation already exists for this email' }, 409);
    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('existing@example.com');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('A pending invitation already exists for this email.')).toBeVisible();
  });

  test('shows error when invited email already has an account', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    api.onPost('/auth/invite', { error: 'A user with this email already has an account' }, 409);
    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('taken@example.com');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('This person already has an account.')).toBeVisible();
  });

  test('shows generic error on server failure', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    api.onPost('/auth/invite', { error: 'Internal server error' }, 500);
    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('fail@example.com');
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('Failed to send invitation. Please try again.')).toBeVisible();
  });

  test('Send Invitation button is disabled when email field is empty', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await expect(page.getByRole('button', { name: 'Send Invitation' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Invite Screen — permission checkbox interactions
// ---------------------------------------------------------------------------

test.describe('Invite Screen — permission checkboxes', () => {
  test('can uncheck create tasks permission', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await page.getByLabel('Can create tasks').uncheck();
    await expect(page.getByLabel('Can create tasks')).not.toBeChecked();
  });

  test('can uncheck edit tasks permission', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await page.getByLabel('Can edit tasks').uncheck();
    await expect(page.getByLabel('Can edit tasks')).not.toBeChecked();
  });

  test('can uncheck delete tasks permission', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await page.getByLabel('Can delete tasks').uncheck();
    await expect(page.getByLabel('Can delete tasks')).not.toBeChecked();
  });

  test('can uncheck assign tasks permission', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await page.getByLabel('Can assign tasks to categories').uncheck();
    await expect(page.getByLabel('Can assign tasks to categories')).not.toBeChecked();
  });

  test('can uncheck all permissions independently', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await page.getByLabel('Can create tasks').uncheck();
    await page.getByLabel('Can edit tasks').uncheck();
    await page.getByLabel('Can delete tasks').uncheck();
    await page.getByLabel('Can assign tasks to categories').uncheck();

    await expect(page.getByLabel('Can create tasks')).not.toBeChecked();
    await expect(page.getByLabel('Can edit tasks')).not.toBeChecked();
    await expect(page.getByLabel('Can delete tasks')).not.toBeChecked();
    await expect(page.getByLabel('Can assign tasks to categories')).not.toBeChecked();
  });

  test('invitation sends with restricted permissions when boxes are unchecked', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);

    let capturedBody: Record<string, unknown> | null = null;
    await page.route('**/api/auth/invite', async (route) => {
      capturedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, json: { message: 'Invitation sent successfully' } });
    });

    await gotoInvitePage(page, api);

    await page.getByPlaceholder('Enter email address').fill('restricted@example.com');
    await page.getByLabel('Can delete tasks').uncheck();
    await page.getByLabel('Can edit tasks').uncheck();
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    await expect(page.getByText('Invitation sent successfully!')).toBeVisible();
    expect(capturedBody?.permDeleteTasks).toBe(false);
    expect(capturedBody?.permEditTasks).toBe(false);
    expect(capturedBody?.permCreateTasks).toBe(true);
    expect(capturedBody?.permAssignTasks).toBe(true);
  });

  test('canManage checkbox is unchecked by default', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoEmpty);
    await gotoInvitePage(page, api);

    await expect(page.getByLabel('Allow this person to manage the group')).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Invite Screen — remove member
// ---------------------------------------------------------------------------

test.describe('Invite Screen — remove member', () => {
  test('removes a member and refreshes the list', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoWithMembers);
    api.onDelete('/auth/group/members/2', { message: 'Member removed from group successfully' });
    // After removal, group info returns no members
    await gotoInvitePage(page, api);

    await expect(page.getByText('Bob Member')).toBeVisible();

    // Override group response after deletion
    api.onGet('/auth/group', groupInfoEmpty);
    await api.apply(page);

    const memberRow = page.locator('.member-item').filter({ hasText: 'Bob Member' });
    await memberRow.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('Bob Member')).not.toBeVisible();
  });

  test('shows error when remove member fails', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/group', groupInfoWithMembers);
    api.onDelete('/auth/group/members/2', { error: 'Failed' }, 500);
    await gotoInvitePage(page, api);

    const memberRow = page.locator('.member-item').filter({ hasText: 'Bob Member' });
    await memberRow.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('Failed to remove member. Please try again.')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Register via invite link
// ---------------------------------------------------------------------------

test.describe('Register via invite link', () => {
  test('pre-fills email from invite token and shows inviter name', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/invite/valid-token-abc', {
      email: 'invited@example.com',
      inviterName: 'Alice Owner',
    });
    api.onGet('/auth/me', {}, 401);
    await api.apply(page);

    await page.goto('/register?inviteToken=valid-token-abc');

    await expect(page.getByText("Alice Owner has invited you to join their task list.")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue('invited@example.com');
    await expect(page.locator('input[name="email"]')).toBeDisabled();
  });

  test('shows error when invite token is invalid or expired', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/invite/bad-token', { error: 'Invalid or expired invitation token' }, 400);
    api.onGet('/auth/me', {}, 401);
    await api.apply(page);

    await page.goto('/register?inviteToken=bad-token');

    await expect(page.getByText('Invalid or expired token')).toBeVisible();
  });

  test('shows shared-access success message after registering via invite', async ({ page }) => {
    const api = new ApiMock();
    api.onGet('/auth/invite/valid-token-abc', {
      email: 'invited@example.com',
      inviterName: 'Alice Owner',
    });
    api.onGet('/auth/me', {}, 401);
    api.onPost('/auth/register', { message: 'Account created', userId: 99 }, 201);
    await api.apply(page);

    await page.goto('/register?inviteToken=valid-token-abc');

    await page.getByLabel('First Name').fill('Dave');
    await page.getByLabel('Last Name').fill('New');
    await page.getByLabel('Password', { exact: true }).fill('Password1!');
    await page.getByLabel('Confirm Password').fill('Password1!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.getByText("Account created! After verifying your email and logging in, you'll have shared access to the group's tasks.")
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Task permission enforcement — members with restricted permissions
// ---------------------------------------------------------------------------

test.describe('Task permission enforcement', () => {
  test('shows error when member without create permission tries to add a todo', async ({ page }) => {
    const noCreateMember = mockUser({
      id: 5,
      email: 'nocreate@example.com',
      group_owner_id: 1,
      group_can_manage: false,
      perm_create_tasks: false,
      perm_edit_tasks: true,
      perm_delete_tasks: true,
      perm_assign_tasks: true,
    });

    const api = new ApiMock();
    api.onGet('/todos', { todos: [] });
    api.onGet('/categories', { categories: [] });
    api.onPost('/todos', { error: 'You do not have permission to create tasks' }, 403);
    await setupAuth(page, api, noCreateMember);
    await page.goto('/');

    await page.getByPlaceholder('Add a new todo...').fill('Should fail');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Failed to create todo')).toBeVisible();
  });

  test('shows error when member without delete permission tries to delete a todo', async ({ page }) => {
    const noDeleteMember = mockUser({
      id: 6,
      email: 'nodelete@example.com',
      group_owner_id: 1,
      group_can_manage: false,
      perm_create_tasks: true,
      perm_edit_tasks: true,
      perm_delete_tasks: false,
      perm_assign_tasks: true,
    });

    const todo = mockTodo({ id: 1, title: 'Cannot delete this' });
    const api = new ApiMock();
    api.onGet('/todos', { todos: [todo] });
    api.onGet('/categories', { categories: [] });
    api.onDelete('/todos/1', { error: 'You do not have permission to delete tasks' }, 403);
    await setupAuth(page, api, noDeleteMember);
    await page.goto('/');

    await expect(page.getByText('Cannot delete this')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Failed to delete todo')).toBeVisible();
  });

  test('shows error when member without edit permission tries to save an edit', async ({ page }) => {
    const noEditMember = mockUser({
      id: 7,
      email: 'noedit@example.com',
      group_owner_id: 1,
      group_can_manage: false,
      perm_create_tasks: true,
      perm_edit_tasks: false,
      perm_delete_tasks: true,
      perm_assign_tasks: true,
    });

    const todo = mockTodo({ id: 1, title: 'Cannot edit this' });
    const api = new ApiMock();
    api.onGet('/todos', { todos: [todo] });
    api.onGet('/categories', { categories: [] });
    api.onPatch('/todos/1', { error: 'You do not have permission to edit tasks' }, 403);
    await setupAuth(page, api, noEditMember);
    await page.goto('/');

    await page.getByRole('button', { name: 'Edit' }).click();
    const editInput = page.locator('.todo-edit-title-input');
    await editInput.clear();
    await editInput.fill('Modified title');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Failed to update todo')).toBeVisible();
  });

  test('group owner has all permissions and can perform all task operations', async ({ page }) => {
    const todo = mockTodo({ id: 1, title: 'Owner task' });
    const created = mockTodo({ id: 2, title: 'New owner task' });
    const api = new ApiMock();
    api.onGet('/todos', { todos: [todo] });
    api.onGet('/categories', { categories: [] });
    api.onPost('/todos', { todo: created }, 201);
    await setupAuth(page, api, owner);
    await page.goto('/');

    await page.getByPlaceholder('Add a new todo...').fill('New owner task');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('New owner task')).toBeVisible();
  });
});
