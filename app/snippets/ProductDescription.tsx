type DescriptionProps = {
  descriptionHtml: string;
};

export function Description({descriptionHtml}: DescriptionProps) {
  return (
    <div>
      <p>
        <strong>Description</strong>
      </p>
      <br />
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
    </div>
  );
}