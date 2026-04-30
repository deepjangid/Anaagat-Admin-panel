import { Modal } from 'antd';

const TeamDeleteModal = ({ open, member, onCancel, onConfirm, loading = false }) => (
  <Modal
    title="Delete Team Member"
    open={open}
    onCancel={onCancel}
    onOk={onConfirm}
    okText="Delete"
    okButtonProps={{ danger: true, loading }}
    cancelText="Cancel"
    destroyOnHidden
  >
    <p className="mb-2 text-slate-700">Are you sure you want to delete this team member?</p>
    {member?.fullName ? (
      <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        {member.fullName}
      </p>
    ) : null}
  </Modal>
);

export default TeamDeleteModal;
