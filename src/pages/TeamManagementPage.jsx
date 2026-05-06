import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Input, Row, Select, Space, message } from 'antd';
import { MdAdd, MdGroups, MdRefresh } from 'react-icons/md';
import TeamCardPreview from '../components/team/TeamCardPreview';
import TeamDeleteModal from '../components/team/TeamDeleteModal';
import TeamMemberForm from '../components/team/TeamMemberForm';
import TeamMembersList from '../components/team/TeamMembersList';
import { adminAPI } from '../services/api';

const defaultMember = {
  fullName: '',
  role: '',
  shortDescription: '',
  profileImage: '',
  profileImageAsset: null,
  linkedInUrl: '',
  email: '',
  cardStyleVariant: 'light',
  active: true,
};

const buildTeamPayload = (values) => ({
  fullName: String(values.fullName || '').trim(),
  name: String(values.fullName || '').trim(),
  role: String(values.role || '').trim(),
  position: String(values.role || '').trim(),
  shortDescription: String(values.shortDescription || '').trim(),
  profileImage: String(values.profileImage || '').trim(),
  ...(values.profileImageAsset !== undefined ? { profileImageAsset: values.profileImageAsset } : {}),
  linkedInUrl: String(values.linkedInUrl || '').trim(),
  email: String(values.email || '').trim().toLowerCase(),
  cardStyleVariant: values.cardStyleVariant === 'featured' ? 'featured' : 'light',
  active: values.active !== false,
  isActive: values.active !== false,
});

const normalizeMembers = (members = []) =>
  [...members].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));

const resequenceMembers = (members = []) =>
  normalizeMembers(members).map((member, index) => ({
    ...member,
    displayOrder: index + 1,
  }));

const TeamManagementPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [draftMember, setDraftMember] = useState({
    ...defaultMember,
    displayOrder: 1,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = useCallback(async (signal) => {
    setLoading(true);
    try {
      const response = await adminAPI.getTeamMembers({ page: 1, limit: 200 }, { signal });
      if (response.data?.success) {
        const normalized = resequenceMembers(response.data.items || []);
        setItems(normalized);
        setDraftMember((current) => (
          current?._id || current?.fullName
            ? current
            : { ...defaultMember, displayOrder: Math.max(1, normalized.length + 1) }
        ));
      } else {
        message.error('Failed to fetch team members.');
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to fetch team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchItems(controller.signal);
    return () => controller.abort();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return normalizeMembers(items).filter((member) => {
      const matchesSearch =
        !query ||
        [member.fullName, member.role, member.shortDescription, member.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesRole = roleFilter === 'all' || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [items, roleFilter, searchValue]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(items.map((item) => item.role).filter(Boolean)));
    return [
      { value: 'all', label: 'All roles' },
      ...roles.map((role) => ({ value: role, label: role })),
    ];
  }, [items]);

  const startCreate = () => {
    const nextDraft = {
      ...defaultMember,
      displayOrder: items.length + 1,
    };
    setEditingId(null);
    setDraftMember(nextDraft);
  };

  const handleEdit = (member) => {
    setEditingId(member._id);
    setDraftMember(member);
  };

  const handleCancel = () => {
    startCreate();
  };

  const handleSubmit = (values) => {
    return (async () => {
      setSaving(true);
      try {
        const payload = buildTeamPayload({ ...draftMember, ...values });

        if (editingId) {
          await adminAPI.updateTeamMember(editingId, payload);
          message.success('Team member updated successfully.');
        } else {
          await adminAPI.createTeamMember(payload);
          message.success('Team member added successfully.');
        }

        setEditingId(null);
        startCreate();
        await fetchItems();
      } catch (error) {
        console.error(error);
        message.error(error?.response?.data?.message || 'Failed to save team member.');
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteTeamMember(deleteTarget._id);
      message.success('Team member deleted successfully.');
      if (editingId === deleteTarget._id) {
        setEditingId(null);
        setDraftMember({
          ...defaultMember,
          displayOrder: Math.max(1, items.length - 1),
        });
      }
      setDeleteTarget(null);
      await fetchItems();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || 'Failed to delete team member.');
    }
  };

  const handleRefresh = () => {
    fetchItems();
  };

  return (
    <div className="team-management-page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Team Management</h1>
            <p>Create, update, and manage team cards shown on the website.</p>
          </div>

          <Space wrap>
            <Button icon={<MdRefresh />} onClick={handleRefresh} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<MdAdd />} onClick={startCreate}>
              Add Team Member
            </Button>
          </Space>
        </div>
      </div>

      <Card className="admin-surface-card mb-4" styles={{ body: { padding: 20 } }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <MdGroups size={26} />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                Team Cards
              </div>
              <div className="text-sm text-slate-500">
                Search, filter, edit, and reorder the cards shown in the frontend team section.
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <Input.Search
              allowClear
              placeholder="Search by name, role, description, or email"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <Select value={roleFilter} options={roleOptions} onChange={setRoleFilter} />
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            className="admin-surface-card"
            title={`Team Members (${filteredItems.length})`}
            styles={{ body: { padding: 20 } }}
            loading={loading}
            data-tour="team-list"
          >
            {filteredItems.length ? (
              <TeamMembersList
                items={filteredItems}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                disabled={saving}
              />
            ) : (
              <Empty description="No team members found. Try a different search or add a new card." />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <div className="grid gap-4">
            <Card
              className="admin-surface-card"
              title={editingId ? 'Edit Team Member' : 'Add Team Member'}
              styles={{ body: { padding: 20 } }}
              data-tour="team-form"
            >
              <TeamMemberForm
                initialValues={draftMember}
                editingId={editingId}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onValuesChange={setDraftMember}
                saving={saving}
              />
            </Card>

            <Card
              title="Live Preview"
              className="admin-surface-card content-preview-card"
              styles={{ body: { padding: 20 } }}
              data-tour="team-preview"
            >
              <TeamCardPreview member={draftMember} />
            </Card>
          </div>
        </Col>
      </Row>

      <TeamDeleteModal
        open={Boolean(deleteTarget)}
        member={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default TeamManagementPage;
