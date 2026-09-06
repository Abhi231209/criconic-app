class UserInfo {
  user = {};
  id = null;
  name = null;
  email = null;
  role = null;
  mobile = null;
  sharingCode = null;
  profileImage = null;

  constructor(user) {
    if (user) {
      this.login(user);
    }
  }

  login(user) {
    if (!user) return;
    this.user = user;
    this.id = user._id || user.id || null;
    this.name = user.username || user.name || null;
    this.email = user.email || null;
    this.role = user.role || null;
    this.mobile = user.mobile || null;
    this.sharingCode = user.sharingCode || null;
    this.profileImage = user.profileImage || user.profileImg || user.photo || null;
    console.log("👤 [User] Logged in as:", { id: this.id, name: this.name, role: this.role });
  }

  logout() {
    this.user = {};
    this.id = null;
    this.name = null;
    this.email = null;
    this.role = null;
    this.mobile = null;
    this.sharingCode = null;
    this.profileImage = null;
    console.log("👤 [User] Logged out");
  }

  isLogin() {
    return Boolean(this.id || this.user?.isLogin || this.user?._id || this.user?.id);
  }

  isAdmin() {
    return (
      this.role === 1 ||
      this.role === 2 ||
      this.user?.role === 1 ||
      this.user?.role === 2
    );
  }

  isSuperAdmin() {
    return this.role === 1 || this.user?.role === 1;
  }
}

const User = new UserInfo();
export default User;
