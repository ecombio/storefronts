type DescriptionProps = {
  descriptionHtml: string;
};

export function Description({descriptionHtml}: DescriptionProps) {
  return (
    <div className="product-description">
      <h2 className="product-description-heading">Description</h2>
      <div
        className="product-description-body"
        dangerouslySetInnerHTML={{__html: descriptionHtml}}
      />
    </div>
  );
}